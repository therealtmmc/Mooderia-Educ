import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer } from "http";
import cors from "cors";
import { setupWebSocketServer, rooms, prepareCards, compileRoomState, startQuestionTimer, revealAnswerAndProgress, broadcastRoomState } from "./src/server/websocket.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createServer(app);

  app.use(cors());

  setupWebSocketServer(server);

  // Set higher request size limits for snap uploads/high fidelity transcripts
  app.use(express.json({ limit: "15mb" }));

  // Shared Gemini client initializer
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // ==========================================
  // HTTP REST API MULTIPLAYER FALLBACK ENDPOINTS
  // ==========================================
  app.post("/api/arena/create", (req, res) => {
    try {
      const { ownerId, nickname, deckTitle, cards } = req.body;
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString(); // Perfect 6-digit PIN
      const preparedCards = prepareCards(cards);

      rooms[roomCode] = {
        roomCode,
        hostSocket: null, // Host via polling
        hostUid: ownerId || "HOST_UID",
        deckTitle: deckTitle || "Study Deck Showdown",
        totalQuestions: preparedCards.length,
        cards: preparedCards,
        players: {},
        status: "lobby",
        currentQuestionIndex: -1,
        timeLeft: 0,
        timerInterval: null
      };

      console.log(`[HTTP Sync] Created Room ${roomCode}`);
      res.json({
        success: true,
        roomCode,
        deckTitle: rooms[roomCode].deckTitle,
        totalQuestions: preparedCards.length
      });
    } catch (e: any) {
      console.error("HTTP Room Create Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/join", (req, res) => {
    try {
      const { roomCode, nickname } = req.body;
      const targetRoomCode = roomCode?.trim();
      const room = rooms[targetRoomCode];

      if (!room) {
        return res.status(404).json({ success: false, error: `Active room ${targetRoomCode} not found.` });
      }

      if (room.status !== "lobby") {
        return res.status(400).json({ success: false, error: "This game has already started!" });
      }

      const playerId = Math.random().toString(36).substring(2, 9);
      const exists = Object.values(room.players).some(p => p.nickname.toLowerCase() === nickname.trim().toLowerCase());
      const finalNickname = exists ? `${nickname.trim()} #${Math.floor(Math.random() * 100)}` : nickname.trim();

      room.players[playerId] = {
        socket: null, // Connected via HTTP Polling
        playerId,
        nickname: finalNickname,
        score: 0,
        streak: 0,
        answeredCorrectly: false,
        answeredThisRound: false,
        answeredAt: 0,
        selectedOptionIndex: null,
        scoreAddedThisRound: 0
      };

      console.log(`[HTTP Sync] Player ${finalNickname} joined Room ${targetRoomCode}`);
      broadcastRoomState(targetRoomCode); // Notify existing WS and hosts

      res.json({
        success: true,
        roomCode: targetRoomCode,
        nickname: finalNickname,
        playerId
      });
    } catch (e: any) {
      console.error("HTTP Join Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/status", (req, res) => {
    try {
      const { roomCode } = req.body;
      const room = rooms[roomCode];

      if (!room) {
        return res.json({ success: false, error: "Room dissolved" });
      }

      const state = compileRoomState(roomCode);
      res.json({ success: true, room: state });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/start", (req, res) => {
    try {
      const { roomCode } = req.body;
      const room = rooms[roomCode];
      if (!room) return res.status(404).json({ success: false, error: "Room not found." });

      room.status = "question";
      room.currentQuestionIndex = 0;
      startQuestionTimer(roomCode);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/submit", (req, res) => {
    try {
      const { roomCode, playerId, optionIndex } = req.body;
      const room = rooms[roomCode];
      if (!room) return res.status(404).json({ success: false, error: "Room not found." });
      if (room.status !== "question") return res.status(400).json({ success: false, error: "Not accepting answers." });

      const player = room.players[playerId];
      if (!player) return res.status(404).json({ success: false, error: "Player not found." });
      if (player.answeredThisRound) return res.json({ success: true, alreadySubmitted: true });

      const currentCard = room.cards[room.currentQuestionIndex];
      const selectedOptionText = currentCard.options[optionIndex];
      const isCorrect = selectedOptionText === currentCard.answer;

      player.answeredThisRound = true;
      player.answeredAt = Date.now();
      player.selectedOptionIndex = optionIndex;
      player.answeredCorrectly = isCorrect;

      if (isCorrect) {
        player.streak += 1;
        const ratio = room.timeLeft / 20;
        const streakBonus = Math.min(player.streak * 50, 250);
        player.scoreAddedThisRound = Math.round(500 + 500 * ratio) + streakBonus;
        player.score += player.scoreAddedThisRound;
      } else {
        player.streak = 0;
        player.scoreAddedThisRound = 0;
      }

      const activePlayers = Object.values(room.players);
      const allAnswered = activePlayers.every(p => p.answeredThisRound);

      if (allAnswered) {
        revealAnswerAndProgress(roomCode);
      } else {
        broadcastRoomState(roomCode);
      }

      res.json({
        success: true,
        feedback: {
          isCorrect,
          scoreAdded: player.scoreAddedThisRound,
          streak: player.streak
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/next", (req, res) => {
    try {
      const { roomCode } = req.body;
      const room = rooms[roomCode];
      if (!room) return res.status(404).json({ success: false, error: "Room not found." });

      if (room.status === "reveal") {
        Object.values(room.players).forEach(p => {
          p.answeredThisRound = false;
          p.selectedOptionIndex = null;
          p.answeredCorrectly = false;
          p.scoreAddedThisRound = 0;
        });

        if (room.currentQuestionIndex + 1 < room.totalQuestions) {
          room.status = "question";
          room.currentQuestionIndex += 1;
          startQuestionTimer(roomCode);
        } else {
          room.status = "podium";
          if (room.timerInterval) clearInterval(room.timerInterval);
          broadcastRoomState(roomCode);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/arena/leave", (req, res) => {
    try {
      const { roomCode, playerId, isHost } = req.body;
      const room = rooms[roomCode];
      if (!room) return res.json({ success: true });

      if (isHost) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        
        Object.values(room.players).forEach(p => {
          try {
            if (p.socket) {
              p.socket.send(JSON.stringify({
                type: "room_destroyed",
                data: { message: "The host has closed the room." }
              }));
            }
          } catch (e) {}
        });

        delete rooms[roomCode];
        console.log(`[HTTP Sync] Room ${roomCode} dissolved (host HTTP leave)`);
      } else {
        if (room.players[playerId]) {
          delete room.players[playerId];
          console.log(`[HTTP Sync] Player ${playerId} left Room ${roomCode}`);
          broadcastRoomState(roomCode);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // AI Quiz Flashcard Generation Route
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { topic, materialText, cardCount = 5 } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Academic topic is required." });
      }

      const ai = getGeminiClient();

      let prompt = `Generate a comprehensive spaced-repetition quiz deck about the topic: "${topic}".`;
      if (materialText) {
        prompt += `\n\nUse the following reference lecture notes/materials to structure the concepts and terminology:\n---START MATERIALS---\n${materialText}\n---END MATERIALS---\n`;
      }
      prompt += `\nGenerate exactly ${cardCount} high-fidelity question/answer flashcards. They should capture vital facts, formulas, principles, processes, or critical theories. Provide logical study cues (hints) and a thorough explanation that helps understudies master the core concepts clearly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are Mooderia AI, an elite academic instructional designer. You excel at extracting learning objectives and generating structured flashcard questions with clear, easy-to-understand student-friendly explanations, paired with helpful clues.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of generated flashcards for academic spaced-repetition review.",
            items: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: "A concise, engaging conceptual or quantitative academic question.",
                },
                answer: {
                  type: Type.STRING,
                  description: "The clear, complete, and accurate high-fidelity academic answer.",
                },
                clue: {
                  type: Type.STRING,
                  description: "A clever, subtle study hint/mnemonic cue to trigger self-recall.",
                },
                explanation: {
                  type: Type.STRING,
                  description: "A thorough academic explanation outlining the context, concept mechanics, or proof background.",
                }
              },
              required: ["question", "answer", "clue", "explanation"],
            },
          },
        },
      });

      const resText = response.text || "[]";
      const cards = JSON.parse(resText.trim());
      res.json({ success: true, cards });
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate academic cards. Please verify your GEMINI_API_KEY is configured in Settings > Secrets.",
      });
    }
  });

  // AI Copilot Route for controlling the app
  app.post("/api/copilot", async (req, res) => {
    try {
      const { messages, appState } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const ai = getGeminiClient();

      const tools = [{
        functionDeclarations: [
          {
            name: "navigate",
            description: "Navigate to a specific tab in the app.",
            parameters: {
              type: Type.OBJECT,
              properties: { 
                tab: { type: Type.STRING, description: "Must be one of: 'folders', 'quizzes', 'profile', 'analytics'" } 
              },
              required: ["tab"]
            }
          },
          {
            name: "toggleSound",
            description: "Turn the app sound effects on or off.",
            parameters: {
              type: Type.OBJECT,
              properties: { 
                enabled: { type: Type.BOOLEAN, description: "True to enable sound, false to mute." } 
              },
              required: ["enabled"]
            }
          },
          {
            name: "createFolder",
            description: "Create a new workspace folder for the user.",
            parameters: {
              type: Type.OBJECT,
              properties: { 
                name: { type: Type.STRING, description: "Name of the folder." },
                description: { type: Type.STRING, description: "Short description of the folder." }
              },
              required: ["name"]
            }
          }
        ]
      }];

      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const stateContextText = `You are Mooderia AI Copilot. You assist the student by controlling the app, navigating, or just answering academic questions. 
Current App State context:
- Active Tab: ${appState?.activeTab}
- Sound Enabled: ${appState?.soundOn}
- Existing Folders: ${appState?.folders?.map((f:any) => f.name).join(", ") || 'None'}

If the user asks to change tabs, mute/unmute, or create a folder, use the provided tools. If the tools complete the action, you can also add a friendly text response acknowledging it.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: stateContextText,
          tools: tools as any
        }
      });

      res.json({ 
        text: response.text, 
        functionCalls: response.functionCalls || [] 
      });
    } catch (error: any) {
      console.error("Copilot AI Error:", error);
      res.status(500).json({
        error: error.message || "Failed to process AI copilot request.",
      });
    }
  });

  // Vercel /api/generate fallback for AI Studio Preview Environment
  app.post("/api/generate", async (req, res) => {
    try {
      const { text, mode } = req.body;
      const ai = getGeminiClient();

      const systemInstruction = `You are the AI brain of Mooderia Education, a playful, Kahoot-like gamified study platform. Convert the student notes into game data. 
CRITICAL: Output ONLY a raw, clean JSON array. NEVER wrap the output in markdown text blocks like \`\`\`json. Never say hello or write explanations.

Format for mode 'quiz': [{"question":"text", "options":["A","B","C","D"], "answer":"exact match"}]
Format for mode 'flashcards': [{"front":"concept", "back":"explanation"}]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Mode: ${mode}\n\nNotes Material:\n${text}`,
        config: {
          temperature: 0.1,
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const resText = response.text || "[]";
      res.json({ result: JSON.parse(resText.trim()) });
    } catch (error: any) {
      console.error("Generation API Error:", error);
      res.status(500).json({ error: "Internal Server Connection Error" });
    }
  });

  // API Catch-all 404 to prevent any non-existent api routes from hitting Vite or index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `API endpoint ${req.method} ${req.url} not found.` });
  });

  // Serve static application in production, bind Vite dev middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    // 1) Safety Fallback Checker
    const baseDir = process.cwd();
    if (typeof baseDir !== "string" || !baseDir) {
      console.error("[Fatal Error] process.cwd() is undefined or invalid. Cannot resolve static assets path.");
      process.exit(1);
    }
    
    // 2) Standard bulletproof path joining for both ESM and CJS Node.js contexts
    const distPath = path.join(baseDir, "dist");
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving compiled static assets from ${distPath}`);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Mooderia Educ backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot Mooderia Educ master backend:", err);
});
