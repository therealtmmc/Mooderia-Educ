import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Serve static application in production, bind Vite dev middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mooderia Educ backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot Mooderia Educ master backend:", err);
});
