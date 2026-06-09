import React, { useState, useEffect, useRef } from "react";
import { QuizDeck, StudentIdentity } from "../types";
import { sound } from "../utils/sound";
import { getBackendHttpUrl, getBackendWsUrl } from "../utils/config";
import { 
  Gamepad2, Users, Trophy, Play, ArrowRight, ShieldCheck, 
  Crown, Flame, Star, Volume2, Award, LogOut, CheckCircle, 
  XCircle, ArrowLeft, RefreshCw, Layers, Plus, Trash2, Edit2, 
  Save, X, PlusCircle, HelpCircle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ArenaViewProps {
  quizzes: QuizDeck[];
  profile: StudentIdentity;
}

// Interactive Pre-made Quiz Decks to host when no custom ones exist or for instant matches
const PRE_MADE_DECKS = [
  {
    id: "pre_made_compsci",
    name: "Computer Science & Computer Networks",
    description: "Battle it out of data structures, protocols, Big-O metrics, and AI principles.",
    cards: [
      {
        question: "What is the worst-case time complexity of searching in a properly balanced Binary Search Tree (BST)?",
        options: ["O(1) Constant", "O(N) Linear", "O(log N) Logarithmic", "O(N log N) Linearithmic"],
        answer: "O(log N) Logarithmic",
        clue: "Height of the balanced tree determines max probes.",
        explanation: "In a fully balanced BST, the height is bound by log2(N). Therefore, lookups, insertions, and deletions take at most proportional to log N steps."
      },
      {
        question: "Which transport layer protocol provides fully reliable, ordered, and error-checked delivery of streams?",
        options: ["UDP (User Datagram Protocol)", "TCP (Transmission Control Protocol)", "DNS (Domain Name System)", "IP (Internet Protocol)"],
        answer: "TCP (Transmission Control Protocol)",
        clue: "Employs three-way handshakes and sequencing sequences.",
        explanation: "TCP handles packet sequences, error verification, flow controls, and packet resends to guarantee reliable data channel stream flows."
      },
      {
        question: "In standard relational databases, what does the 'I' represent in ACID transaction metrics?",
        options: ["Identity", "Isolation", "Integration", "Immutable"],
        answer: "Isolation",
        clue: "Prevents concurrent transactions from contaminating each other.",
        explanation: "Isolation ensures that concurrent transactions execute as if they are the only ones running, avoiding dirty reads or phantom updates."
      },
      {
        question: "What type of neural network layer is highly optimal for spatial grid features (like image patterns)?",
        options: ["Recurrent Neural Layer", "Dense Linear Layer", "Convolutional Layer (CNN)", "Dropout Regularization Layer"],
        answer: "Convolutional Layer (CNN)",
        clue: "Uses sliding kernels to scan visual grids.",
        explanation: "Convolutional layers apply kernel filters across multidimensional arrays to map localized spatial patterns independently of location."
      }
    ]
  },
  {
    id: "pre_made_medical",
    name: "Human Biochemistry & Cell Biology",
    description: "An intensive exam game of cellular respiration, enzymes, molecular bounds, and hormones.",
    cards: [
      {
        question: "Which organelle acts as the main site for synthesis of ATP during glucose oxidation?",
        options: ["Mitochondria", "Lysosome", "Golgi Apparatus", "Endoplasmic Reticulum"],
        answer: "Mitochondria",
        clue: "Referred to as the metabolic powerhouse of human cells.",
        explanation: "The Mitochondria carries out the citric acid cycle and oxidative phosphorylation via its inner membrane electron transport chains to assemble ATP."
      },
      {
        question: "What high-energy molecule serves as the direct universal biological energy currency inside human cells?",
        options: ["Glucose-6-Phosphate", "Adenosine Triphosphate (ATP)", "Nicotinamide Adenine Dinucleotide (NADH)", "Creatine Phosphate"],
        answer: "Adenosine Triphosphate (ATP)",
        clue: "Releases energy when losing its terminal phosphorus group.",
        explanation: "ATP is the principal molecule for storing and transferring energy in cells, acting as the immediate power currency."
      },
      {
        question: "Which chemical bond coordinates standard water molecules together into cohesive high-surface-tension sheets?",
        options: ["Covalent Bonds", "Ionic Associations", "Hydrogen Bonds", "Van der Waals interactions"],
        answer: "Hydrogen Bonds",
        clue: "An electrostatic dipole force involving highly electronegative oxygen atoms.",
        explanation: "Hydrogen bonding arises between positive hydrogen ends and highly negative oxygen sites of adjoining water molecules."
      }
    ]
  }
];

export default function ArenaView({ quizzes, profile }: ArenaViewProps) {
  // Websocket instance references
  const ws = useRef<WebSocket | null>(null);

  // Dynamic Host resolution for supporting both absolute external and local backend hosts
  const getBackendUrl = (path: string) => {
    return getBackendHttpUrl(path);
  };
  
  // Custom interactive arenas persistent state
  const [customArenas, setCustomArenas] = useState<{
    id: string;
    name: string;
    description: string;
    cards: {
      question: string;
      options: string[];
      answer: string;
      clue?: string;
      explanation?: string;
    }[];
  }[]>(() => {
    try {
      const stored = localStorage.getItem("mooderia_custom_arenas");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State to track if we're currently in the Arena Creator/Editor view
  const [editorDeck, setEditorDeck] = useState<{
    id: string;
    name: string;
    description: string;
    cards: {
      question: string;
      options: string[];
      answer: string;
      clue?: string;
      explanation?: string;
    }[];
  } | null>(null);
  
  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<"ws" | "http">("ws");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<"host" | "player" | null>(null);
  const [myNickname, setMyNickname] = useState(profile.name.split(" ")[0] || "Scholar");
  const [inputRoomCode, setInputRoomCode] = useState("");
  
  // Quiz Room states synced from WebSocket
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [gameStatus, setGameStatus] = useState<"lobby" | "question" | "reveal" | "podium">("lobby");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scoreboard, setScoreboard] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string;
    options: string[];
    answer?: string;
    explanation?: string;
  } | null>(null);
  
  // Player local response state
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<{
    submitted: boolean;
    isCorrect?: boolean;
    scoreAdded?: number;
    streak?: number;
  } | null>(null);

  // Auto clean-up connections
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handlePop = () => sound.playPop();
  const handleTick = () => sound.playTick();
  const handleChime = () => sound.playChime();

  const initiateHttpFallback = (actionOnFallback?: () => void) => {
    setActiveChannel("http");
    setConnectionStatus("connected");
    setErrorText(null);
    console.warn("🌐 [Multiplayer Protocol] Activating HTTP fallback tunnel...");
    if (actionOnFallback) {
      actionOnFallback();
    }
  };

  const createRoomViaHttp = async (deckName: string, cardsList: any[]) => {
    try {
      const res = await fetch(getBackendUrl("/api/arena/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: profile.studentId || "HOST_UID",
          nickname: myNickname,
          deckTitle: deckName,
          cards: cardsList
        })
      });
      
      // Safe parsing of response text in case of HTML error pages
      const rawText = await res.text();
      if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
        console.error("[Network Error] Received HTML instead of JSON for room creation:", rawText);
        throw new Error("Server configuration error (the API returned HTML 404).");
      }
      
      const data = JSON.parse(rawText);
      if (data.success) {
        setRoomCode(data.roomCode);
        setDeckTitle(data.deckTitle);
        setTotalQuestions(data.totalQuestions);
        setGameStatus("lobby");
        handleChime();
      } else {
        setErrorText(data.error || "Failed to sync battle room over HTTP.");
      }
    } catch (err: any) {
      setErrorText(`Handshake over HTTP rejected: ${err.message}`);
    }
  };

  const joinRoomViaHttp = async (targetRoomCode: string) => {
    try {
      const res = await fetch(getBackendUrl("/api/arena/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: targetRoomCode,
          nickname: myNickname
        })
      });
      
      // Safe parsing of response text in case of HTML error pages
      const rawText = await res.text();
      if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
        console.error("[Network Error] Received HTML instead of JSON for joining:", rawText);
        throw new Error("Server configuration error (the API returned HTML 404).");
      }

      const data = JSON.parse(rawText);
      if (data.success) {
        setRoomCode(data.roomCode);
        setMyPlayerId(data.playerId);
        setMyNickname(data.nickname);
        setGameStatus("lobby");
        handleChime();
      } else {
        setErrorText(data.error || "Room index not active or nickname rejected.");
      }
    } catch (err: any) {
      setErrorText(`Failed to bind player thread: ${err.message}`);
    }
  };

  // High-frequency polling effect for HTTP mode fallback
  useEffect(() => {
    if (activeChannel === "http" && role !== null && roomCode) {
      let active = true;
      const poll = async () => {
        try {
          const res = await fetch(getBackendUrl("/api/arena/status"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomCode, playerId: myPlayerId })
          });
          
          const rawText = await res.text();
          if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
            console.error("[Status Polling] Received HTML instead of JSON status:", rawText);
            return;
          }

          const data = JSON.parse(rawText);
          if (!active) return;
          if (data.success && data.room) {
            setGameStatus(data.room.status);
            setCurrentQuestionIdx(data.room.currentQuestionIndex);
            setTotalQuestions(data.room.totalQuestions);
            setTimeLeft(data.room.timeLeft);
            setScoreboard(data.room.scoreboard);
            setCurrentQuestion(data.room.currentQuestion);
            setDeckTitle(data.room.deckTitle);
            
            // Sync player-level feedback if round parameters are updated on server
            if (role === "player" && myPlayerId) {
              const pData = data.room.scoreboard.find((p: any) => p.playerId === myPlayerId);
              if (pData) {
                if (pData.answered && answeredIndex === null) {
                  setAnsweredIndex(pData.selected);
                  setRoundFeedback({
                    submitted: true,
                    isCorrect: pData.isCorrect,
                    scoreAdded: pData.addedPoints,
                    streak: pData.streak
                  });
                }
              }
            }
          } else if (data.success === false && data.error === "Room dissolved") {
            alert("This battle room has been dissolved by the host.");
            resetToDash();
          }
        } catch (e) {
          console.error("HTTP status poll error:", e);
        }
      };

      poll();
      const interval = setInterval(poll, 1200);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }
  }, [activeChannel, role, roomCode, myPlayerId, answeredIndex]);

  // Create or Join WebSockets connection channel
  const connectToServer = (onSuccess: (socket: WebSocket) => void, onFailure?: () => void) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      onSuccess(ws.current);
      return;
    }

    setConnectionStatus("connecting");
    setErrorText(null);

    try {
      const wsUrl = getBackendWsUrl();
      console.log(`[WS Connection] Directing bridge to: ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        setActiveChannel("ws");
        setConnectionStatus("connected");
        console.log("[WS Connection] WebSocket handshake completed successfully.");
        onSuccess(socket);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;
          console.log(`[WS Incoming] Type: ${type}`, data);

          switch (type) {
            case "room_created": {
              setRoomCode(data.roomCode);
              setDeckTitle(data.deckTitle);
              setTotalQuestions(data.totalQuestions);
              setGameStatus("lobby");
              handleChime();
              break;
            }

            case "joined_successfully": {
              setRoomCode(data.roomCode);
              setMyPlayerId(data.playerId);
              setMyNickname(data.nickname);
              setGameStatus("lobby");
              handleChime();
              break;
            }

            case "room_update": {
              if (data.roomCode) {
                setRoomCode(data.roomCode);
              }
              setGameStatus(data.status);
              setCurrentQuestionIdx(data.currentQuestionIndex);
              setTotalQuestions(data.totalQuestions);
              setTimeLeft(data.timeLeft);
              setScoreboard(data.scoreboard);
              setCurrentQuestion(data.currentQuestion);

              if (data.status === "question" && timeLeft === 20) {
                sound.playChime();
                setAnsweredIndex(null);
                setRoundFeedback(null);
              }
              break;
            }

            case "answer_acknowledged": {
              setRoundFeedback({
                submitted: true,
                isCorrect: data.isCorrect,
                scoreAdded: data.scoreAdded,
                streak: data.streak
              });
              if (data.isCorrect) {
                sound.playCorrect();
              } else {
                sound.playIncorrect();
              }
              break;
            }

            case "room_destroyed": {
              alert(data.message || "Active room dissolved.");
              resetToDash();
              break;
            }

            case "error": {
              setErrorText(data.message);
              sound.playIncorrect();
              break;
            }
          }
        } catch (e) {
          console.error("WS event decoding parse failure: ", e);
        }
      };

      socket.onclose = () => {
        setConnectionStatus("disconnected");
        console.warn("[WS] Connection lost.");
        if (onFailure) {
          onFailure();
        }
      };

      socket.onerror = (err) => {
        console.error("[WS] Pipeline mismatch error:", err);
        if (onFailure) {
          onFailure();
        } else {
          // Switch to HTTP fallback immediately if socket fails during run
          initiateHttpFallback();
        }
      };

    } catch (err: any) {
      setConnectionStatus("disconnected");
      setErrorText(`WebSocket configuration crash: ${err.message}`);
    }
  };

  const resetToDash = async () => {
    if (roomCode && role !== null) {
      if (activeChannel === "ws") {
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
      } else {
        try {
          await fetch(getBackendUrl("/api/arena/leave"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomCode,
              playerId: myPlayerId,
              isHost: role === "host"
            })
          });
        } catch (e) {}
      }
    }

    setRoomCode(null);
    setRole(null);
    setGameStatus("lobby");
    setAnsweredIndex(null);
    setRoundFeedback(null);
    setConnectionStatus("disconnected");
    setErrorText(null);
    setActiveChannel("ws"); // Reset channel back to WS for next session
    handlePop();
  };

  const handleCreateNewArena = () => {
    handlePop();
    setEditorDeck({
      id: "arena_" + Date.now(),
      name: "",
      description: "",
      cards: [
        {
          question: "",
          options: ["", "", "", ""],
          answer: "",
          clue: "",
          explanation: ""
        }
      ]
    });
  };

  const handleEditArena = (arena: any) => {
    handlePop();
    // Create a deep copy of the arena to avoid state mutation
    setEditorDeck(JSON.parse(JSON.stringify(arena)));
  };

  const handleDeleteArena = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this custom Arena deck?")) return;
    handlePop();
    const updated = customArenas.filter(a => a.id !== id);
    setCustomArenas(updated);
    localStorage.setItem("mooderia_custom_arenas", JSON.stringify(updated));
  };

  const handleSaveArena = () => {
    if (!editorDeck) return;
    if (!editorDeck.name.trim()) {
      alert("Please enter a name for your custom Arena.");
      return;
    }

    // Check that there is at least 1 question
    if (editorDeck.cards.length === 0) {
      alert("Please add at least one question to your custom Arena.");
      return;
    }

    // Validate cards
    for (let i = 0; i < editorDeck.cards.length; i++) {
      const card = editorDeck.cards[i];
      if (!card.question.trim()) {
        alert(`Question ${i + 1} is empty. Please enter a valid question.`);
        return;
      }
      
      // Ensure all 4 options are populated
      for (let oIdx = 0; oIdx < 4; oIdx++) {
        if (!card.options[oIdx] || !card.options[oIdx].trim()) {
          alert(`Option ${oIdx + 1} in Question ${i + 1} is empty. All 4 choices must be filled.`);
          return;
        }
      }

      // Check if correct answer is selected
      if (!card.answer) {
        alert(`Please select the correct answer option for Question ${i + 1}.`);
        return;
      }
    }

    handleChime();
    let updated;
    const exists = customArenas.find(a => a.id === editorDeck.id);
    if (exists) {
      updated = customArenas.map(a => a.id === editorDeck.id ? editorDeck : a);
    } else {
      updated = [editorDeck, ...customArenas];
    }

    setCustomArenas(updated);
    localStorage.setItem("mooderia_custom_arenas", JSON.stringify(updated));
    setEditorDeck(null);
  };

  const handleCancelEditor = () => {
    handlePop();
    if (window.confirm("Abandon changes? Unsaved edits will be lost.")) {
      setEditorDeck(null);
    }
  };

  const handleAddQuestionToEditor = () => {
    if (!editorDeck) return;
    handlePop();
    setEditorDeck({
      ...editorDeck,
      cards: [
        ...editorDeck.cards,
        {
          question: "",
          options: ["", "", "", ""],
          answer: "",
          clue: "",
          explanation: ""
        }
      ]
    });
  };

  const handleRemoveQuestionFromEditor = (index: number) => {
    if (!editorDeck) return;
    handlePop();
    const updatedCards = editorDeck.cards.filter((_, i) => i !== index);
    setEditorDeck({
      ...editorDeck,
      cards: updatedCards
    });
  };

  const handleUpdateCardField = (cardIdx: number, field: string, value: any) => {
    if (!editorDeck) return;
    const updatedCards = [...editorDeck.cards];
    if (field === "question" || field === "clue" || field === "explanation" || field === "answer") {
      updatedCards[cardIdx] = {
        ...updatedCards[cardIdx],
        [field]: value
      };
    }
    setEditorDeck({
      ...editorDeck,
      cards: updatedCards
    });
  };

  const handleUpdateCardOption = (cardIdx: number, optionIdx: number, value: string) => {
    if (!editorDeck) return;
    const updatedCards = [...editorDeck.cards];
    const updatedOptions = [...updatedCards[cardIdx].options];
    
    const prevOptionValue = updatedOptions[optionIdx];
    updatedOptions[optionIdx] = value;
    
    // If the changed option was previously marked as the correct answer, auto update structural link too!
    const isAnswer = updatedCards[cardIdx].answer === prevOptionValue;
    
    updatedCards[cardIdx] = {
      ...updatedCards[cardIdx],
      options: updatedOptions,
      answer: isAnswer ? value : updatedCards[cardIdx].answer
    };
    
    setEditorDeck({
      ...editorDeck,
      cards: updatedCards
    });
  };

  const handleHostRoom = (deckName: string, cardsList: any[]) => {
    handleTick();
    setRole("host");
    
    let wsTimedOut = false;
    const wsTimeout = setTimeout(() => {
      wsTimedOut = true;
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.warn("[WS Host] Handshake protocol timed out. Re-routing through HTTP tunnel...");
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        initiateHttpFallback(() => createRoomViaHttp(deckName, cardsList));
      }
    }, 4500);

    connectToServer(
      (socket) => {
        clearTimeout(wsTimeout);
        if (wsTimedOut) return;
        
        socket.send(JSON.stringify({
          type: "create_room",
          data: {
            ownerId: profile.studentId || "HOST_UID",
            nickname: myNickname,
            deckTitle: deckName,
            cards: cardsList
          }
        }));
      },
      () => {
        clearTimeout(wsTimeout);
        if (wsTimedOut) return;
        wsTimedOut = true;
        console.warn("[WS Host] Direct connection failure. Re-routing immediately through HTTP tunnel...");
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        initiateHttpFallback(() => createRoomViaHttp(deckName, cardsList));
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode = inputRoomCode.trim();
    if (!targetCode) return;
    handleTick();
    setRole("player");

    let wsTimedOut = false;
    const wsTimeout = setTimeout(() => {
      wsTimedOut = true;
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.warn("[WS Join] Handshake protocol timed out. Requesting entry via HTTP channel...");
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        initiateHttpFallback(() => joinRoomViaHttp(targetCode));
      }
    }, 4500);

    connectToServer(
      (socket) => {
        clearTimeout(wsTimeout);
        if (wsTimedOut) return;

        socket.send(JSON.stringify({
          type: "join_room",
          data: {
            roomCode: targetCode,
            nickname: myNickname
          }
        }));
      },
      () => {
        clearTimeout(wsTimeout);
        if (wsTimedOut) return;
        wsTimedOut = true;
        console.warn("[WS Join] Direct connection failure. Requesting entry immediately via HTTP channel...");
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        initiateHttpFallback(() => joinRoomViaHttp(targetCode));
      }
    );
  };

  const handleStartGame = async () => {
    handleChime();
    if (activeChannel === "ws") {
      if (!ws.current || role !== "host") return;
      ws.current.send(JSON.stringify({ type: "start_game" }));
    } else {
      if (!roomCode || role !== "host") return;
      try {
        await fetch(getBackendUrl("/api/arena/start"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode })
        });
      } catch (err) {
        console.error("Failed to post start command over HTTP:", err);
      }
    }
  };

  const handleSubmitAnswer = async (index: number) => {
    if (role !== "player" || answeredIndex !== null) return;
    setAnsweredIndex(index);
    handleTick();

    if (activeChannel === "ws") {
      if (!ws.current) return;
      ws.current.send(JSON.stringify({
        type: "submit_answer",
        data: { optionIndex: index }
      }));
    } else {
      if (!roomCode || !myPlayerId) return;
      try {
        const res = await fetch(getBackendUrl("/api/arena/submit"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode, playerId: myPlayerId, optionIndex: index })
        });
        
        const rawText = await res.text();
        if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
          console.error("[Submit Answer] Received HTML instead of JSON:", rawText);
          return;
        }

        const data = JSON.parse(rawText);
        if (data.success && data.feedback) {
          setRoundFeedback({
            submitted: true,
            isCorrect: data.feedback.isCorrect,
            scoreAdded: data.feedback.scoreAdded,
            streak: data.feedback.streak
          });
          if (data.feedback.isCorrect) {
            sound.playCorrect();
          } else {
            sound.playIncorrect();
          }
        }
      } catch (e) {
        console.error("HTTP answer submission trigger error:", e);
      }
    }
  };

  const handleNextStep = async () => {
    handleTick();
    if (activeChannel === "ws") {
      if (!ws.current || role !== "host") return;
      ws.current.send(JSON.stringify({ type: "next_question" }));
    } else {
      if (!roomCode || role !== "host") return;
      try {
        await fetch(getBackendUrl("/api/arena/next"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode })
        });
      } catch (err) {
        console.error("Failed to register next step command over HTTP:", err);
      }
    }
  };

  // Predefined stylized Kahoot button properties
  const optionStyles = [
    { bg: "bg-red-600 hover:bg-red-700 border-red-500", text: "text-white", shape: "▲", name: "Red Triangle" },
    { bg: "bg-blue-600 hover:bg-blue-700 border-blue-500", text: "text-white", shape: "◆", name: "Blue Diamond" },
    { bg: "bg-amber-500 hover:bg-amber-600 border-amber-400", text: "text-white", shape: "●", name: "Yellow Circle" },
    { bg: "bg-emerald-600 hover:bg-emerald-700 border-emerald-500", text: "text-white", shape: "■", name: "Green Square" }
  ];

  const currentMatchedPlayer = scoreboard.find(p => p.playerId === myPlayerId);

  // -------------------------------------------------------------
  // RENDER DOCK: ARENA BUILDER / EDITOR
  // -------------------------------------------------------------
  if (editorDeck !== null) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 bg-slate-950/70 border border-slate-900 p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-505 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 font-mono text-[9px] uppercase font-bold">
              <Gamepad2 className="w-3 h-3" />
              <span>Multiplayer Build Console</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              ARENA <span className="text-indigo-400">BUILDER</span>
            </h2>
          </div>
          
          <button
            onClick={handleCancelEditor}
            className="p-2 border border-slate-950 hover:border-slate-800 text-slate-500 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Cancel and Exit Builder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Basic Deck Metadata */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 space-y-4 relative z-10">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Arena Name / Subject Cover</label>
            <input 
              type="text" 
              required
              placeholder="e.g. AI Ethics & Advanced Neural Networks Bowl"
              value={editorDeck.name}
              onChange={(e) => setEditorDeck({ ...editorDeck, name: e.target.value })}
              className="w-full text-sm text-white bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-550 transition-all font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Brief Deck Summary / Description</label>
            <textarea
              placeholder="Provide a competitive description detailing covered metrics, protocols, or exam courses."
              value={editorDeck.description}
              onChange={(e) => setEditorDeck({ ...editorDeck, description: e.target.value })}
              className="w-full text-sm text-white bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-555 h-20 transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* List of Game Cards Questions */}
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider font-bold uppercase">
              Challenge Questions ({editorDeck.cards.length})
            </h3>
            <button
              onClick={handleAddQuestionToEditor}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-305 font-bold flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-8">
            {editorDeck.cards.map((card, cardIdx) => {
              return (
                <div 
                  key={cardIdx}
                  className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl space-y-6 relative"
                >
                  {/* Card Section Header */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <span className="text-xs font-mono text-indigo-400 font-black">
                      #Question CHALLENGE {cardIdx + 1}
                    </span>
                    {editorDeck.cards.length > 1 && (
                      <button
                        onClick={() => handleRemoveQuestionFromEditor(cardIdx)}
                        className="text-[10px] font-mono text-rose-450 hover:text-rose-400 font-bold flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Question</span>
                      </button>
                    )}
                  </div>

                  {/* Question Title */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Challenge Question Prompt</label>
                    <input 
                      type="text" 
                      placeholder="Enter the question query that matches player screen options"
                      value={card.question}
                      onChange={(e) => handleUpdateCardField(cardIdx, "question", e.target.value)}
                      className="w-full text-sm text-white bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-505 transition-all font-semibold"
                    />
                  </div>

                  {/* Options Grid */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                        Choices Options (Requires exactly 4)
                      </label>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">
                        Select one option check as correct answer
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {card.options.map((opt, optIdx) => {
                        const style = optionStyles[optIdx];
                        const isCorrect = card.answer !== "" && card.answer === opt;

                        return (
                          <div 
                            key={optIdx}
                            className={`flex items-center gap-2.5 bg-slate-950 p-2 border border-slate-850 rounded-xl transition-all ${
                              isCorrect 
                                ? "ring-2 ring-emerald-500/50 border-emerald-500/50" 
                                : "focus-within:border-slate-700"
                            }`}
                          >
                            {/* Shape indicator representing active gameplay shape symbols */}
                            <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center font-black text-sm select-none shrink-0">
                              {style.shape}
                            </span>

                            {/* Option Input */}
                            <input 
                              type="text" 
                              placeholder={`Option choice ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleUpdateCardOption(cardIdx, optIdx, e.target.value)}
                              className="bg-transparent text-xs font-semibold text-white focus:outline-none w-full min-w-0"
                            />

                            {/* Mark Correct Option Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                handlePop();
                                if (opt.trim()) {
                                  handleUpdateCardField(cardIdx, "answer", opt);
                                } else {
                                  alert("Please specify option value before marking as correct!");
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all shrink-0 ${
                                isCorrect 
                                  ? "bg-emerald-950 border-emerald-500 text-emerald-400 font-bold"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
                              }`}
                              title={isCorrect ? "Correct answer" : "Select as correct"}
                            >
                              <CheckCircle className={`w-3.5 h-3.5 ${isCorrect ? "fill-current text-emerald-400" : ""}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Metadata Row (Clue, Explanation) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Visual Clue (Optional)</label>
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. Height determines lookup log"
                        value={card.clue || ""}
                        onChange={(e) => handleUpdateCardField(cardIdx, "clue", e.target.value)}
                        className="w-full text-xs text-white bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Explanation (Optional)</label>
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. Balanced trees are height-bounded by log2(N)"
                        value={card.explanation || ""}
                        onChange={(e) => handleUpdateCardField(cardIdx, "explanation", e.target.value)}
                        className="w-full text-xs text-white bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleAddQuestionToEditor}
              type="button"
              className="px-6 py-3 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/5 hover:bg-indigo-950/15 text-indigo-400 text-xs font-mono font-bold rounded-2xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Another Question Challenge</span>
            </button>
          </div>
        </div>

        {/* Editor Bottom Actions */}
        <div className="pt-6 border-t border-slate-900 flex justify-end gap-3 relative z-10">
          <button
            onClick={handleCancelEditor}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveArena}
            className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 border-t border-white/20 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Custom Arena</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER DOCK 1: CHANNELS SELECTION DASHBOARD
  // -------------------------------------------------------------
  if (role === null) {
    // Combine custom user decks with preloaded trivia templates and our created customArenas
    const hostableDecks = [
      ...customArenas.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || `Custom Arena with ${a.cards.length} interactive questions.`,
        cards: a.cards,
        isCustomArena: true
      })),
      ...(profile.signedIn || (profile.studentId && profile.studentId !== "STU-2026-9082" && !profile.studentId.startsWith("STU-")) ? [] : PRE_MADE_DECKS),
      ...quizzes.map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description || `Study materials compilation of ${q.cards.length} spaced questions.`,
        cards: q.cards,
        isCustomArena: false
      }))
    ];

    return (
      <div className="space-y-8 w-full">
        {/* Arena Welcome Jumbotron Banner */}
        <div className="bg-gradient-to-br from-indigo-950/80 via-indigo-900/40 to-slate-950 p-6 sm:p-10 rounded-3xl border border-indigo-500/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-4 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 font-mono text-[10px] uppercase font-semibold">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Multiplayer Battlefront Live</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              THE QUIZ <span className="text-indigo-400">ARENA</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Experience dynamic, synchronized classroom quizzes. Join as a player to answer with rapid reflexes for score multipliers, or host games using your own customized recall flashcard decks!
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <div className="text-xs text-slate-400">
                Logged in as: <span className="text-indigo-400 font-black tracking-wide uppercase">{profile.name}</span>
              </div>
            </div>
          </div>
          
          {/* Join Portal Card */}
          <div className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl w-full max-w-xs shrink-0 shadow-lg relative z-10 flex flex-col gap-4">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400">Join Active Room</h3>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Room Access Code</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  required
                  placeholder="e.g. 582914"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.2em] font-black text-white bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 transition-all uppercase"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Set Battle Nickname</label>
                <input 
                  type="text" 
                  required
                  maxLength={12}
                  placeholder="Nickname"
                  value={myNickname}
                  onChange={(e) => setMyNickname(e.target.value)}
                  className="w-full text-sm font-semibold text-white bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all text-center"
                />
              </div>

              {errorText && (
                <p className="text-xs text-rose-450 bg-rose-950/20 px-3 py-1.5 border border-rose-900/30 rounded-xl font-mono uppercase text-center">{errorText}</p>
              )}

              <button
                type="submit"
                disabled={connectionStatus === "connecting"}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {connectionStatus === "connecting" ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>ENTERING ARENA...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>JOIN BATTLE ROOM</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* List of Hostable Study Materials */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-450" />
              <h3 className="text-lg font-bold font-display text-white uppercase tracking-tight">HOST A NEW BATTLE SESSION</h3>
            </div>
            
            <button
              onClick={handleCreateNewArena}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 self-start cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CREATE CUSTOM ARENA</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hostableDecks.map((deck) => (
              <div 
                key={deck.id}
                className="bg-slate-950/50 border border-slate-900 hover:border-indigo-500/20 hover:bg-slate-950 p-5 rounded-2xl transition-all shadow-xl flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-black text-slate-100 uppercase tracking-tight line-clamp-1 group-hover:text-white transition-colors">
                      {deck.name}
                    </h4>
                    <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-full font-mono text-[9px] uppercase font-bold text-slate-400 self-start shrink-0">
                      {deck.cards.length} Question{deck.cards.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{deck.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 pt-3 border-t border-slate-900/65">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    {deck.isCustomArena 
                      ? "⚔️ CUSTOM BATTLE ARENA" 
                      : deck.id.startsWith("pre_made") 
                        ? "🏆 ACADEMIC BOWLS PRESET" 
                        : "📂 PERSONAL CABINET IMPORT"}
                  </div>
                  
                  <div className="flex items-center gap-2 justify-end self-end sm:self-auto">
                    {deck.isCustomArena && (
                      <>
                        <button
                          onClick={() => handleEditArena(deck)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Edit Arena"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteArena(deck.id, e)}
                          className="p-2 bg-slate-900 hover:bg-rose-950/20 text-rose-405 hover:text-rose-400 border border-slate-800 hover:border-rose-900/30 rounded-lg cursor-pointer transition-colors"
                          title="Delete Arena"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleHostRoom(deck.name, deck.cards)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-805 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono font-bold text-indigo-450 hover:text-indigo-400 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <span>Host Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER DOCK 1.5: CONNECTION/ERROR FALLBACK VIEWS
  // -------------------------------------------------------------
  if (role !== null) {
    if (connectionStatus === "connecting" || !roomCode) {
      return (
        <div className="max-w-xl mx-auto bg-slate-950/60 border border-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 relative">
              <div className="absolute inset-x-0 inset-y-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black">Establishing Secure Sync Tunnel</p>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Syncing with Battle Arena...</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Generating unique room credentials and spawning secure WebSocket threads on the centralized education ledger.
            </p>
            <div className="pt-4">
              <button 
                onClick={resetToDash}
                className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel Link
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (connectionStatus === "disconnected" || errorText) {
      return (
        <div className="max-w-xl mx-auto bg-slate-950/60 border border-rose-950/40 p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="relative z-10 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-black">Secure Link Severed</p>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Sync Failure</h2>
            <p className="text-xs text-rose-300 bg-rose-950/20 px-4 py-2 border border-rose-900/30 rounded-xl font-mono leading-relaxed max-w-sm mx-auto">
              {errorText || "Could not complete handshake protocol with the battle server. Please check your network connection or verify the room code."}
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <button 
                onClick={resetToDash}
                className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-950 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setErrorText(null);
                  resetToDash();
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-mono uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Reset Arena
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // -------------------------------------------------------------
  // RENDER DOCK 2: GAME LOBBY
  // -------------------------------------------------------------
  if (gameStatus === "lobby") {
    return (
      <div className="max-w-2xl mx-auto bg-slate-950/60 border border-slate-900 p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden space-y-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Lobby Header */}
        <div className="text-center space-y-4 relative z-10">
          <button 
            onClick={resetToDash}
            className="absolute top-0 left-0 text-slate-500 hover:text-white flex items-center gap-1 text-xs font-mono transition-colors uppercase border border-slate-900 px-3 py-1 rounded-xl bg-slate-950/40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>

          <div className="mx-auto w-10 h-10 rounded-xl bg-indigo-650/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>

          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {role === "host" ? "Hosting Battle Station" : "Standing By inside lobby..."}
          </p>
          <div className="inline-block px-10 py-5 bg-gradient-to-tr from-indigo-950 to-slate-950 border-2 border-indigo-500/30 rounded-3xl shadow-2xl relative group">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-md group-hover:blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black leading-none mb-1">ROOMLINK ACCESS PIN</p>
            <h1 className="text-5xl sm:text-7xl font-black text-white tracking-[0.15em] leading-none pl-[0.15em] select-all uppercase">
              {roomCode}
            </h1>
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-tight mt-2 max-w-md mx-auto line-clamp-1">{deckTitle}</h2>
        </div>

        {/* Players lists */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Connected Understudies ({scoreboard.length})
            </span>
            {role === "host" && (
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wide">
                Require participants to begin
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence>
              {scoreboard.map((player) => (
                <motion.div
                  key={player.playerId}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`p-3 border rounded-xl flex items-center justify-between text-xs transition-all ${
                    player.playerId === myPlayerId
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-200"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <span className="font-bold uppercase tracking-tight truncate pl-1">{player.nickname}</span>
                  {player.playerId === myPlayerId && (
                    <span className="px-1.5 py-0.5 bg-indigo-500 text-white font-mono text-[8px] uppercase font-black tracking-widest rounded-md shrink-0">
                      You
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {scoreboard.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 font-mono uppercase">
                Waiting for matches to join...
              </div>
            )}
          </div>
        </div>

        {/* Host controls or Player standby feedback message */}
        <div className="pt-6 border-t border-slate-900 relative z-10 text-center">
          {role === "host" ? (
            <button
              onClick={handleStartGame}
              disabled={scoreboard.length === 0}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-500 border-t border-white/20 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-950/50 hover:-translate-y-0.5 transition-all cursor-pointer disabled:cursor-not-allowed group"
            >
              <span className="flex items-center gap-2 justify-center">
                <span>Start Study Battle</span>
                <Play className="w-4 h-4 fill-current text-white group-disabled:text-slate-500" />
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 justify-center text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>WAITING FOR THE HOST `{profile.name.split(" ")[0]}` TO LAUNCH THE SHOW...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER DOCK 3: ACTIVE QUESTION PHASE
  // -------------------------------------------------------------
  if (gameStatus === "question") {
    // Determine player countdown width ratio
    const percentage = (timeLeft / 20) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {role === "host" && (
          <div className="w-full bg-gradient-to-r from-violet-950/90 to-indigo-950/90 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold leading-none">Hosting Active Battle Arena</p>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">{deckTitle || "Study Deck Showdown"}</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 px-4 py-2 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Live Room Code:</span>
              <span className="text-lg font-black text-indigo-300 tracking-wider font-mono select-all uppercase">
                {roomCode || "----"}
              </span>
            </div>
          </div>
        )}

        {/* Progress HUD bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 border border-slate-900 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-indigo-950 text-indigo-400 font-mono text-xs font-bold rounded-lg uppercase tracking-wider">
              Q. {currentQuestionIdx + 1} of {totalQuestions}
            </span>
            <span className="text-sm font-semibold text-slate-350 tracking-tight hidden sm:inline truncate max-w-xs">{deckTitle}</span>
            {role === "host" && (
              <span className="px-3 py-1.5 bg-indigo-650/30 border border-indigo-500/35 text-indigo-300 font-mono text-xs font-bold rounded-lg uppercase tracking-wider animate-pulse whitespace-nowrap">
                CODE: {roomCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Sync bar */}
            <div className="flex-1 sm:w-48 bg-slate-900 h-2 rounded-full overflow-hidden relative">
              <motion.div 
                className={`h-full ${timeLeft <= 5 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${percentage}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-slate-500">SECS:</span>
              <span className={timeLeft <= 5 ? "text-rose-450 animate-pulse" : ""}>{timeLeft}</span>
            </span>
          </div>
        </div>

        {/* Big Question Center Box */}
        <div className="bg-gradient-to-b from-slate-900 to-[#0c101c] border border-slate-850 p-8 rounded-3xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-650/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-sm font-mono font-black animate-pulse">
            ?
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight max-w-2xl mx-auto leading-relaxed select-none">
            {currentQuestion?.question}
          </h2>
        </div>

        {/* Multi-choice Answers layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion?.options.map((option, idx) => {
            const hasChosen = answeredIndex === idx;
            const style = optionStyles[idx];
            
            // Host view is passive (no clicking)
            const isPassive = role === "host";

            return (
              <button
                key={idx}
                disabled={isPassive || answeredIndex !== null}
                onClick={() => handleSubmitAnswer(idx)}
                className={`w-full relative py-6 px-8 rounded-2xl border-b-4 flex items-center gap-4 transition-all shadow-xl group cursor-pointer text-left ${
                  isPassive 
                    ? `bg-slate-950 border-slate-900 text-slate-400 select-none opacity-80 cursor-default`
                    : answeredIndex === null
                      ? `${style.bg} ${style.text} hover:-translate-y-0.5`
                      : hasChosen
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-900 text-slate-600 opacity-40 select-none"
                }`}
              >
                {/* Kahoot iconic Shape indicators */}
                <span className={`w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg text-white group-hover:scale-105 transition-all shrink-0 select-none`}>
                  {style.shape}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-mono opacity-50 uppercase tracking-widest">{style.name}</div>
                  <span className="text-sm font-black uppercase tracking-tight leading-relaxed">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer feedback row */}
        <div className="text-center p-4 bg-slate-950 border border-slate-900 rounded-2xl">
          {role === "host" ? (
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-mono text-slate-400 uppercase">
                Active connections submitted answers: {scoreboard.filter(p => p.playerId !== myPlayerId && p.answered).length} of {scoreboard.filter(p => p.playerId !== myPlayerId).length}
              </span>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 rounded-xl text-xs font-mono font-bold transition-all hover:scale-102 cursor-pointer"
              >
                Force End Timer
              </button>
            </div>
          ) : answeredIndex === null ? (
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
              <Flame className="w-4 h-4 text-indigo-400" />
              <span>Make selections instantly for speed point multipliers!</span>
            </p>
          ) : (
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider animate-pulse font-black">
              ✓ Responses successfully processed! Awaiting peer uploads...
            </p>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER DOCK 4: QUESTION ANSWER REVEAL / SCORESTANDINGS
  // -------------------------------------------------------------
  if (gameStatus === "reveal") {
    const isOwnerCorrect = roundFeedback?.isCorrect;
    const addedPoints = roundFeedback?.scoreAdded || 0;
    const currentStreak = roundFeedback?.streak || 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {role === "host" && (
          <div className="w-full bg-gradient-to-r from-violet-950/90 to-indigo-950/90 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold leading-none">Hosting Active Battle Arena</p>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">{deckTitle || "Study Deck Showdown"}</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 px-4 py-2 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Live Room Code:</span>
              <span className="text-lg font-black text-indigo-300 tracking-wider font-mono select-all uppercase">
                {roomCode || "----"}
              </span>
            </div>
          </div>
        )}
        
        {/* Reveal Results Banner Card */}
        <div className="bg-slate-950 border border-slate-900 p-6 sm:p-8 rounded-3xl relative overflow-hidden text-center space-y-4 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-900/10 rounded-full blur-3xl pointer-events-none" />
          
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">QUESTION COMPLETED</p>
          <h2 className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 max-w-md mx-auto">{currentQuestion?.question}</h2>
          
          <div className="pt-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Correct Answer</p>
            <div className="inline-flex items-center gap-3 bg-emerald-950/50 px-6 py-3 border border-emerald-900 rounded-2xl leading-none">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-black text-emerald-400 uppercase tracking-tight">{currentQuestion?.answer}</span>
            </div>
          </div>

          {currentQuestion?.explanation && (
            <p className="text-xs text-slate-350 leading-relaxed max-w-lg mx-auto italic font-mono uppercase bg-slate-900/40 p-4 border border-slate-900 rounded-xl">
              💡 {currentQuestion?.explanation}
            </p>
          )}
        </div>

        {/* Player Personal Stat Board (Only for player) */}
        {role === "player" && (
          <div className={`p-4 border rounded-2xl flex items-center justify-between text-xs font-mono uppercase tracking-wider ${
            isOwnerCorrect 
              ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" 
              : answeredIndex === null
                ? "bg-slate-900 border-slate-800 text-slate-450"
                : "bg-rose-950/20 border-rose-900 text-rose-400"
          }`}>
            <span className="font-bold flex items-center gap-1.5 pl-1">
              {isOwnerCorrect ? (
                <>
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Correct response!</span>
                </>
              ) : answeredIndex === null ? (
                <>
                  <XCircle className="w-4 h-4 text-slate-450" />
                  <span>No options submitted (Timeout)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-450" />
                  <span>Incorrect selection</span>
                </>
              )}
            </span>

            <div className="flex items-center gap-4 pr-1">
              <span>Points Added: <strong className="text-white">+{addedPoints}</strong></span>
              {currentStreak > 0 && (
                <span className="flex items-center gap-0.5 text-indigo-400 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                  <span>STREAK: {currentStreak}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Score standings dynamic board */}
        <div className="bg-slate-950/70 border border-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-black flex items-center gap-1">
              <Star className="w-4 h-4 text-indigo-400 fill-current" />
              <span>SCORE STANDINGS BOARD</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
              Points
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {scoreboard.map((player, idx) => {
              const place = idx + 1;
              const isMine = player.playerId === myPlayerId;

              return (
                <div 
                  key={player.playerId}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs uppercase tracking-tight ${
                    isMine 
                      ? "bg-indigo-600/15 border-indigo-500 text-white font-bold"
                      : "bg-slate-900/60 border-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] bg-slate-950 border border-slate-900 w-6 h-6 rounded-md flex items-center justify-center font-bold text-slate-450">
                      #{place}
                    </span>
                    <span className="font-bold truncate max-w-[130px]">{player.nickname}</span>
                    {player.addedPoints > 0 && (
                      <span className="text-[9px] font-mono text-emerald-450 select-none animate-pulse shrink-0">
                        (+{player.addedPoints})
                      </span>
                    )}
                    {player.streak >= 2 && (
                      <span className="flex items-center gap-0.5 bg-indigo-950 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold select-none shrink-0 tracking-widest">
                        <Flame className="w-3 h-3 fill-current text-indigo-400" />
                        <span>{player.streak} FLAME</span>
                      </span>
                    )}
                  </div>
                  
                  <span className="font-mono font-bold text-indigo-400 font-extrabold pr-1">
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host controls */}
        {role === "host" && (
          <div className="text-center pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3 bg-indigo-650 hover:bg-indigo-600 border-t border-white/20 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
            >
              <span>{currentQuestionIdx + 1 < totalQuestions ? "NEXT QUESTION" : "REVEAL FINAL PODIUM"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER DOCK 5: THE FINAL PODIUM CHAMPIONS BOARD
  // -------------------------------------------------------------
  if (gameStatus === "podium") {
    // Collect Top 3 players
    const podiumList = scoreboard.slice(0, 3);

    return (
      <div className="max-w-2xl mx-auto space-y-8 text-center pb-24">
        {role === "host" && (
          <div className="w-full bg-gradient-to-r from-violet-950/90 to-indigo-950/90 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold leading-none">Hosting Active Battle Arena</p>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">{deckTitle || "Study Deck Showdown"}</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 px-4 py-2 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Live Room Code:</span>
              <span className="text-lg font-black text-indigo-300 tracking-wider font-mono select-all uppercase">
                {roomCode || "----"}
              </span>
            </div>
          </div>
        )}
        
        {/* Banner with crown */}
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-650/10 border-2 border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold font-mono animate-bounce shadow-xl">
            👑
          </div>
          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Arena Grand finale finished</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
            THE ARENA <span className="text-indigo-500">CHAMPIONS</span>
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-tight max-w-sm mx-auto line-clamp-1">{deckTitle}</p>
        </div>

        {/* The Trophies podium column displays */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 min-h-[300px]">
          
          {/* SILVER - 2nd Place */}
          {podiumList[1] && (
            <div className="flex flex-col items-center gap-2 max-w-[130px] sm:max-w-none">
              <span className="text-xs font-black text-slate-300 uppercase tracking-tight leading-none text-center truncate">{podiumList[1].nickname}</span>
              <span className="text-[10px] font-mono text-slate-500">{podiumList[1].score} pts</span>
              
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 110 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-20 sm:w-28 bg-gradient-to-t from-slate-900 to-slate-800 border-x border-t border-slate-700 rounded-t-2xl shadow-2xl flex flex-col justify-end items-center pb-4 relative"
              >
                <div className="absolute top-2 w-8 h-8 rounded-full bg-slate-700 text-slate-200 border border-slate-600 flex items-center justify-center text-xs font-mono font-bold font-black">2</div>
                <Trophy className="w-7 h-7 text-slate-400" />
                <span className="text-[9px] font-mono text-slate-400 uppercase font-black tracking-widest mt-1">Silver</span>
              </motion.div>
            </div>
          )}

          {/* GOLD - 1st Place */}
          {podiumList[0] && (
            <div className="flex flex-col items-center gap-2 max-w-[130px] sm:max-w-none">
              <span className="text-sm font-black text-white uppercase tracking-tight leading-none text-center truncate flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-indigo-400 fill-current shrink-0" />
                <span>{podiumList[0].nickname}</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-300 font-bold">{podiumList[0].score} pts</span>
              
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 150 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-24 sm:w-32 bg-gradient-to-t from-indigo-950 via-indigo-900/60 to-indigo-850 border-x border-t border-indigo-500/45 rounded-t-3xl shadow-2xl shadow-indigo-950/60 flex flex-col justify-end items-center pb-6 relative"
              >
                <div className="absolute top-2 w-10 h-10 rounded-full bg-indigo-500/30 text-white border-2 border-indigo-400 flex items-center justify-center text-sm font-bold font-black">1</div>
                <Trophy className="w-9 h-9 text-indigo-400 fill-current animate-pulse" />
                <span className="text-[9px] font-mono text-indigo-300 uppercase font-bold tracking-wider mt-1">CHAMPION</span>
              </motion.div>
            </div>
          )}

          {/* BRONZE - 3rd Place */}
          {podiumList[2] && (
            <div className="flex flex-col items-center gap-2 max-w-[130px] sm:max-w-none">
              <span className="text-xs font-black text-slate-400 uppercase tracking-tight leading-none text-center truncate">{podiumList[2].nickname}</span>
              <span className="text-[10px] font-mono text-slate-500">{podiumList[2].score} pts</span>
              
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 80 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                className="w-20 sm:w-28 bg-gradient-to-t from-slate-900 to-slate-850 border-x border-t border-slate-800 rounded-t-2xl shadow-2xl flex flex-col justify-end items-center pb-4 relative"
              >
                <div className="absolute top-2 w-8 h-8 rounded-full bg-amber-900/20 text-amber-700 border border-amber-800/30 flex items-center justify-center text-xs font-mono font-bold font-black">3</div>
                <Trophy className="w-6 h-6 text-amber-500" />
                <span className="text-[9px] font-mono text-amber-500/80 uppercase font-black tracking-widest mt-1">Bronze</span>
              </motion.div>
            </div>
          )}

        </div>

        {/* Action redirect button */}
        <div className="pt-6 relative z-10 text-center">
          <button
            onClick={resetToDash}
            className="px-10 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white text-xs font-mono font-bold uppercase tracking-widest rounded-2xl shadow-2xl cursor-pointer"
          >
            <span>Return to Arena Hub</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
