import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface Player {
  socket: WebSocket;
  playerId: string;
  nickname: string;
  score: number;
  streak: number;
  answeredCorrectly: boolean;
  answeredThisRound: boolean;
  answeredAt: number;
  selectedOptionIndex: number | null;
  scoreAddedThisRound: number;
}

interface Room {
  roomCode: string;
  hostSocket: WebSocket;
  hostUid: string;
  deckTitle: string;
  totalQuestions: number;
  cards: {
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
  }[];
  players: { [id: string]: Player };
  status: "lobby" | "question" | "reveal" | "podium";
  currentQuestionIndex: number;
  timeLeft: number;
  timerInterval: NodeJS.Timeout | null;
}

const rooms: { [code: string]: Room } = {};

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const parentUrl = request.headers.host ? `http://${request.headers.host}` : "http://localhost";
      const pathname = new URL(request.url || "", parentUrl).pathname;
      // Upgrade standard HTTP requests to WebSocket connection on port 3000
      if (pathname === "/multiplayer" || pathname === "/") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (e) {
      console.error("Upgrade parsing failure: ", e);
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    const playerId = Math.random().toString(36).substring(2, 9);
    let currentRoomCode: string | null = null;

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message);
        const { type, data } = payload;

        switch (type) {
          case "create_room": {
            const { ownerId, nickname, deckTitle, cards } = data;
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit numeric code

            // Map and synthesize MC options if cards only have QA format
            const preparedCards = cards.map((card: any, idx: number) => {
              let options = card.options || [];
              if (options.length < 2) {
                // Get other answers from other cards to make distractors
                const otherAnswers = cards
                  .map((c: any) => c.answer)
                  .filter((ans: string) => ans !== card.answer && ans && ans.trim().length > 0);

                const distractors = otherAnswers
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 3);

                const rawOptions = [card.answer, ...distractors];
                // Remove duplicates and shuffle
                options = Array.from(new Set(rawOptions)).sort(() => Math.random() - 0.5);
              }

              return {
                question: card.question,
                options,
                answer: card.answer,
                explanation: card.explanation || card.clue || ""
              };
            });

            const newRoom: Room = {
              roomCode,
              hostSocket: ws,
              hostUid: ownerId,
              deckTitle,
              totalQuestions: preparedCards.length,
              cards: preparedCards,
              players: {},
              status: "lobby",
              currentQuestionIndex: -1,
              timeLeft: 0,
              timerInterval: null
            };

            rooms[roomCode] = newRoom;
            currentRoomCode = roomCode;

            ws.send(JSON.stringify({
              type: "room_created",
              data: { roomCode, deckTitle, totalQuestions: preparedCards.length }
            }));
            
            // Broadcast initial state
            broadcastRoomState(roomCode);
            break;
          }

          case "join_room": {
            const { roomCode, nickname } = data;
            const targetRoomCode = roomCode?.trim();
            const room = rooms[targetRoomCode];

            if (!room) {
              ws.send(JSON.stringify({ type: "error", data: { message: `Active room ${targetRoomCode} not found.` } }));
              return;
            }

            if (room.status !== "lobby") {
              ws.send(JSON.stringify({ type: "error", data: { message: "This game has already started!" } }));
              return;
            }

            // Check duplicate nickname
            const exists = Object.values(room.players).some(p => p.nickname.toLowerCase() === nickname.trim().toLowerCase());
            const finalNickname = exists ? `${nickname.trim()} #${Math.floor(Math.random() * 90)}` : nickname.trim();

            const newPlayer: Player = {
              socket: ws,
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

            room.players[playerId] = newPlayer;
            currentRoomCode = targetRoomCode;

            ws.send(JSON.stringify({
              type: "joined_successfully",
              data: { roomCode: targetRoomCode, nickname: finalNickname, playerId }
            }));

            // Notify everyone in the lobby
            broadcastRoomState(targetRoomCode);
            break;
          }

          case "start_game": {
            if (!currentRoomCode) return;
            const room = rooms[currentRoomCode];
            if (!room || room.hostSocket !== ws) return;

            room.status = "question";
            room.currentQuestionIndex = 0;
            startQuestionTimer(currentRoomCode);
            break;
          }

          case "submit_answer": {
            if (!currentRoomCode) return;
            const room = rooms[currentRoomCode];
            if (!room || room.status !== "question") return;

            const player = room.players[playerId];
            if (!player || player.answeredThisRound) return;

            const { optionIndex } = data;
            const currentCard = room.cards[room.currentQuestionIndex];
            const selectedOptionText = currentCard.options[optionIndex];
            const isCorrect = selectedOptionText === currentCard.answer;

            player.answeredThisRound = true;
            player.answeredAt = Date.now();
            player.selectedOptionIndex = optionIndex;
            player.answeredCorrectly = isCorrect;

            // Score calculation (Kahoot dynamic scoring): max 1000 points, min 500 when matching correct answer
            if (isCorrect) {
              player.streak += 1;
              const ratio = room.timeLeft / 20; // 20 seconds total
              const streakBonus = Math.min(player.streak * 50, 250); // Up to 250 bonus points
              player.scoreAddedThisRound = Math.round(500 + 500 * ratio) + streakBonus;
              player.score += player.scoreAddedThisRound;
            } else {
              player.streak = 0;
              player.scoreAddedThisRound = 0;
            }

            // Acknowledge answer submission to player
            ws.send(JSON.stringify({
              type: "answer_acknowledged",
              data: { isCorrect, scoreAdded: player.scoreAddedThisRound, streak: player.streak }
            }));

            // Check if all active players in room have submitted answers
            const activePlayers = Object.values(room.players);
            const allAnswered = activePlayers.every(p => p.answeredThisRound);

            if (allAnswered) {
              revealAnswerAndProgress(currentRoomCode);
            } else {
              broadcastRoomState(currentRoomCode);
            }
            break;
          }

          case "next_question": {
            if (!currentRoomCode) return;
            const room = rooms[currentRoomCode];
            if (!room || room.hostSocket !== ws) return;

            if (room.status === "reveal") {
              // Reset all player round flags before executing next question
              Object.values(room.players).forEach(p => {
                p.answeredThisRound = false;
                p.selectedOptionIndex = null;
                p.answeredCorrectly = false;
                p.scoreAddedThisRound = 0;
              });

              if (room.currentQuestionIndex + 1 < room.totalQuestions) {
                room.status = "question";
                room.currentQuestionIndex += 1;
                startQuestionTimer(currentRoomCode);
              } else {
                room.status = "podium";
                if (room.timerInterval) clearInterval(room.timerInterval);
                broadcastRoomState(currentRoomCode);
              }
            }
            break;
          }

          case "leave_room": {
            handleDisconnection();
            break;
          }
        }
      } catch (e) {
        console.error("Multiplayer message parse/handling fault:", e);
      }
    });

    const handleDisconnection = () => {
      if (!currentRoomCode) return;
      const room = rooms[currentRoomCode];
      if (!room) return;

      if (room.hostSocket === ws) {
        // Host disconnected. Destroy room and alert participants.
        if (room.timerInterval) clearInterval(room.timerInterval);
        
        Object.values(room.players).forEach(p => {
          try {
            p.socket.send(JSON.stringify({
              type: "room_destroyed",
              data: { message: "The host has closed the room or lost connection." }
            }));
          } catch(e) {}
        });

        delete rooms[currentRoomCode];
        console.log(`[WS] Room ${currentRoomCode} dissolved (host disconnect)`);
      } else {
        // Regular player disconnected. Remove and broadcast.
        if (room.players[playerId]) {
          const name = room.players[playerId].nickname;
          delete room.players[playerId];
          console.log(`[WS] Player ${name} left room ${currentRoomCode}`);
          broadcastRoomState(currentRoomCode);
        }
      }
    };

    ws.on("close", handleDisconnection);
    ws.on("error", handleDisconnection);
  });
}

function startQuestionTimer(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timeLeft = 20; // 20s countdown per question

  broadcastRoomState(roomCode);

  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1;
    if (room.timeLeft <= 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      revealAnswerAndProgress(roomCode);
    } else {
      broadcastRoomState(roomCode);
    }
  }, 1000);
}

function revealAnswerAndProgress(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.timerInterval) clearInterval(room.timerInterval);
  room.status = "reveal";

  // Force round completion flag for any lagging players
  Object.values(room.players).forEach(p => {
    if (!p.answeredThisRound) {
      p.answeredThisRound = true;
      p.answeredCorrectly = false;
      p.streak = 0;
      p.scoreAddedThisRound = 0;
      p.selectedOptionIndex = null;
    }
  });

  broadcastRoomState(roomCode);
}

function broadcastRoomState(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  const currentCard = room.currentQuestionIndex >= 0 && room.currentQuestionIndex < room.totalQuestions 
    ? room.cards[room.currentQuestionIndex] 
    : null;

  // Compile leaderboard list of top active players sorted by overall score
  const scoreboard = Object.values(room.players)
    .map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      score: p.score,
      answered: p.answeredThisRound,
      isCorrect: p.answeredCorrectly,
      selected: p.selectedOptionIndex,
      addedPoints: p.scoreAddedThisRound,
      streak: p.streak
    }))
    .sort((a, b) => b.score - a.score);

  const payload = {
    type: "room_update",
    data: {
      roomCode: room.roomCode,
      deckTitle: room.deckTitle,
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.totalQuestions,
      timeLeft: room.timeLeft,
      scoreboard,
      currentQuestion: currentCard ? {
        question: currentCard.question,
        options: currentCard.options,
        answer: currentCard.answer, // Exposed in reveal phase
        explanation: currentCard.explanation
      } : null
    }
  };

  const messageStr = JSON.stringify(payload);

  // Send to host first
  try {
    room.hostSocket.send(messageStr);
  } catch(e) {}

  // Send to all players
  Object.values(room.players).forEach(p => {
    try {
      p.socket.send(messageStr);
    } catch (e) {}
  });
}
