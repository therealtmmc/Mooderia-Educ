import React, { useState, useEffect, useRef } from "react";
import { FolderCabinet, QuizDeck, Flashcard, QuizAttempt } from "../types";
import { sound } from "../utils/sound";
import { 
  Trophy, RefreshCw, Library, Plus, 
  Trash2, Brain, Check, X, Hourglass, ArrowLeft, Lightbulb, Play, Eye, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuizzesViewProps {
  quizzes: QuizDeck[];
  setQuizzes: React.Dispatch<React.SetStateAction<QuizDeck[]>>;
  folders: FolderCabinet[];
  onQuizAttemptFinished: (attempt: QuizAttempt) => void;
}

export default function QuizzesView({ quizzes, setQuizzes, folders, onQuizAttemptFinished }: QuizzesViewProps) {
  // Navigation & Screen Control
  const [activeScreen, setActiveScreen] = useState<'list' | 'create' | 'quiz'>('list');
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);

  // Deck Custom Creation States
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [linkedFolderId, setLinkedFolderId] = useState("");

  // Manual Flashcard Entries Creator
  const [manualCards, setManualCards] = useState<Flashcard[]>([]);
  const [cardType, setCardType] = useState<'identification' | 'true-false' | 'multiple-choice'>('identification');
  const [cardQ, setCardQ] = useState("");
  const [cardA, setCardA] = useState("");
  const [cardClue, setCardClue] = useState("");
  const [cardExpl, setCardExpl] = useState("");

  // Multiple Choice Options
  const [mcOptions, setMcOptions] = useState<string[]>(["", "", "", ""]);
  const [mcCorrectIdx, setMcCorrectIdx] = useState<number>(0);

  // True/False Option
  const [tfCorrect, setTfCorrect] = useState<"True" | "False">("True");

  // Timed evaluation engine state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [userAnswersTrack, setUserAnswersTrack] = useState<{cardIdx: number, correct: boolean}[]>([]);
  const [scoreCount, setScoreCount] = useState(0);

  // Interactive Quiz State
  const [userTypedAnswer, setUserTypedAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);

  // Interval timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Sound triggers
  const handlePop = () => sound.playPop();
  const handleTick = () => sound.playTick();
  const handleChime = () => sound.playChime();

  // Manual addition of cards to the artisan builder deck
  const handleAddManualCard = () => {
    if (!cardQ.trim()) return;

    let finalAnswer = "";
    let finalOptions: string[] | undefined = undefined;

    if (cardType === "true-false") {
      finalAnswer = tfCorrect;
      finalOptions = ["True", "False"];
    } else if (cardType === "multiple-choice") {
      // Filter out non-empty options
      const filtered = mcOptions.map(o => o.trim()).filter(o => o !== "");
      if (filtered.length < 2) {
        alert("Please provide at least 2 options for Multiple Choice.");
        return;
      }
      finalOptions = filtered;
      // Map correct answer from selections
      const resolvedCorrectInput = mcOptions[mcCorrectIdx]?.trim() || filtered[0];
      finalAnswer = resolvedCorrectInput;
      if (!finalOptions.includes(finalAnswer)) {
        finalOptions.push(finalAnswer);
      }
    } else {
      if (!cardA.trim()) {
        alert("Please enter the correct answer definition.");
        return;
      }
      finalAnswer = cardA.trim();
    }

    handleTick();
    const newCard: Flashcard = {
      id: `card_${Date.now()}_${manualCards.length}`,
      question: cardQ.trim(),
      answer: finalAnswer,
      clue: cardClue.trim() || undefined,
      explanation: cardExpl.trim() || undefined,
      strength: 0,
      questionType: cardType,
      options: finalOptions
    };

    setManualCards(prev => [...prev, newCard]);

    // Reset card fields
    setCardQ("");
    setCardA("");
    setCardClue("");
    setCardExpl("");
    setMcOptions(["", "", "", ""]);
    setMcCorrectIdx(0);
    setTfCorrect("True");
  };

  // Submit completely customized handmade recall deck
  const handleCreateManualDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim() || manualCards.length === 0) return;

    const newDeck: QuizDeck = {
      id: `deck_man_${Date.now()}`,
      name: newDeckName.trim(),
      description: newDeckDesc.trim(),
      folderId: linkedFolderId || undefined,
      cards: manualCards,
      attemptsCount: 0,
      createdAt: new Date().toISOString()
    };

    setQuizzes(prev => [newDeck, ...prev]);
    setNewDeckName("");
    setNewDeckDesc("");
    setLinkedFolderId("");
    setManualCards([]);
    setActiveScreen('list');
    handleChime();
  };

  // Delete deck
  const handleDeleteDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleTick();
    setConfirmAction({
      message: "Are you sure you want to scrap this study recall deck? All flashcards and scores associated with it will be deleted.",
      onConfirm: () => {
        setQuizzes(prev => prev.filter(q => q.id !== id));
        setConfirmAction(null);
      }
    });
  };

  // Timed Quiz Playing Engine
  const handleLaunchQuiz = (deck: QuizDeck) => {
    handlePop();
    setSelectedDeck(deck);
    setCurrentCardIdx(0);
    setScoreCount(0);
    setSecondsElapsed(0);
    setIsQuizComplete(false);
    setUserAnswersTrack([]);

    // Clear and reset interactive gameplay states
    setUserTypedAnswer("");
    setSelectedChoice(null);
    setHasCheckedAnswer(false);
    setAnsweredCorrectly(null);

    // Launch clock ticker
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    setActiveScreen('quiz');
  };

  // Check the answer interactively
  const handleCheckInteractive = (submittedAnswer: string) => {
    if (!selectedDeck) return;
    const card = selectedDeck.cards[currentCardIdx];
    
    const cleanUser = submittedAnswer.trim().toLowerCase();
    const cleanCorrect = card.answer.trim().toLowerCase();

    const isCorrect = cleanUser === cleanCorrect;
    setAnsweredCorrectly(isCorrect);
    setHasCheckedAnswer(true);

    if (isCorrect) {
      sound.playCorrect();
      setScoreCount(prev => prev + 1);
    } else {
      sound.playIncorrect();
    }

    // Accumulate answer logs for strength index update
    setUserAnswersTrack(prev => [...prev, { cardIdx: currentCardIdx, correct: isCorrect }]);
  };

  // Move to the next question
  const handleProceedNext = () => {
    if (!selectedDeck) return;

    // Reset interactive fields for the next card
    setUserTypedAnswer("");
    setSelectedChoice(null);
    setHasCheckedAnswer(false);
    setAnsweredCorrectly(null);

    if (currentCardIdx + 1 < selectedDeck.cards.length) {
      setCurrentCardIdx(prev => prev + 1);
    } else {
      handleCompleteQuizSession();
    }
  };

  // Complete session and save the attempt profile details
  const handleCompleteQuizSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsQuizComplete(true);
    handleChime();

    if (!selectedDeck) return;

    const finalAttempt: QuizAttempt = {
      id: "attempt_" + Date.now(),
      deckId: selectedDeck.id,
      deckName: selectedDeck.name,
      score: scoreCount,
      totalQuestions: selectedDeck.cards.length,
      timeInSeconds: secondsElapsed,
      date: new Date().toISOString()
    };

    // Update parent attempts matrix
    onQuizAttemptFinished(finalAttempt);

    // Update quizzes deck strength metrics
    setQuizzes(prev => prev.map(q => {
      if (q.id === selectedDeck.id) {
        const attemptsCountUpdated = q.attemptsCount + 1;
        const bScore = Math.max(q.bestScore || 0, scoreCount);
        return {
          ...q,
          attemptsCount: attemptsCountUpdated,
          lastScore: scoreCount,
          bestScore: bScore,
          cards: q.cards.map((c, i) => {
            const indexMatch = userAnswersTrack.find(track => track.cardIdx === i);
            const isCorrect = indexMatch ? indexMatch.correct : false;
            let currentStr = c.strength;
            if (isCorrect) {
              currentStr = Math.min(5, currentStr + 1);
            } else {
              currentStr = Math.max(0, currentStr - 1);
            }
            return {
              ...c,
              strength: currentStr,
              lastReviewed: new Date().toISOString()
            };
          })
        };
      }
      return q;
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs uppercase font-mono tracking-widest bg-violet-500/10 text-indigo-400 border border-violet-500/20 rounded">
              Spaced Repetition Decks
            </span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white uppercase sm:text-4xl">
            Academia Recalls
          </h1>
          <p className="text-sm text-slate-400 font-sans max-w-xl">
            Create custom interactive review materials with multiple choices, true or false options, and identification questions supporting 100% offline persistence.
          </p>
        </div>

        {activeScreen === 'list' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { handlePop(); setActiveScreen('create'); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-950 relative overflow-hidden group cursor-pointer border-t border-white/15"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>Create New Recall Deck</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* SCREEN: LIST DECKS */}
        {activeScreen === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {quizzes.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-slate-800/85 rounded-2xl p-8">
                <div className="mx-auto w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500">
                  <Library className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-display font-medium text-white mb-1">Recall Decks Empty</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Initiate educational drills by crafting custom, interactive study decks.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => { handlePop(); setActiveScreen('create'); }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white rounded-xl"
                  >
                    Build Deck Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {quizzes.map(quiz => {
                  const strengthSum = quiz.cards.reduce((sum, card) => sum + card.strength, 0);
                  const totalStrs = quiz.cards.length * 5;
                  const ratio = totalStrs > 0 ? (strengthSum / totalStrs) * 100 : 0;

                  return (
                    <motion.div
                      key={quiz.id}
                      whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => handleLaunchQuiz(quiz)}
                      className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-3xl p-6 relative cursor-pointer group flex flex-col justify-between shadow-xl min-h-[240px] overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-550/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold">
                            {quiz.cards.length} QUESTIONS / {quiz.attemptsCount > 0 ? `DRILLED ${quiz.attemptsCount}X` : "NEW DECK"}
                          </span>
                        </div>

                        <h3 className="font-black uppercase text-xl leading-snug text-white group-hover:text-indigo-400 transition-colors">
                          {quiz.name}
                        </h3>

                        {quiz.description && (
                          <p className="text-xs text-slate-400 font-sans line-clamp-2 h-8 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-850/50 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider">
                          <span className="text-slate-500 uppercase font-semibold">RECALL ACCURACY STRENGTH</span>
                          <span className="text-indigo-400 font-bold">{Math.ceil(ratio)}% strength</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/60 border border-slate-850 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
                            style={{ width: `${ratio}%` }} 
                          />
                        </div>

                        <div className="flex items-center justify-between pt-3">
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                            <span>Best: <strong className="text-white">{quiz.bestScore ?? 0}/{quiz.cards.length}</strong></span>
                            <span>•</span>
                            <span>Last: <strong className="text-white">{quiz.lastScore ?? 0}/{quiz.cards.length}</strong></span>
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            <button
                              onClick={(e) => handleDeleteDeck(quiz.id, e)}
                              className="p-1.5 bg-slate-950/80 hover:bg-rose-950 border border-slate-850 text-slate-500 hover:text-rose-450 rounded-xl transition-all"
                              title="Scrap Deck"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="p-2 bg-indigo-650 text-white rounded-xl group-hover:bg-indigo-500 group-hover:scale-105 transition-all shadow-md shadow-indigo-950/20">
                              <Play className="w-3.5 h-3.5 text-white fill-current" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* SCREEN: BUILD DECK COMPILER */}
        {activeScreen === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative hover:border-indigo-500/10 transition-all"
          >
            {/* Top Back Nav */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
              <button
                onClick={() => { handlePop(); setActiveScreen('list'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 hover:text-white transition-all text-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dismiss Builder</span>
              </button>
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
                Artisan Builder Deck Mode
              </span>
            </div>

            {/* FORM */}
            <form onSubmit={handleCreateManualDeck} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Recall Deck Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm General Chemistry Review"
                    value={newDeckName}
                    onChange={e => setNewDeckName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Linked Study Cabinet (Optional)</label>
                  <select
                    value={linkedFolderId}
                    onChange={e => setLinkedFolderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="">-- No linked cabinet --</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.subject})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Recall Study Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Spaced recognition testing definitions and formulas..."
                  value={newDeckDesc}
                  onChange={e => setNewDeckDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                />
              </div>

              {/* CARD FACTORY COMPILER */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                  <h4 className="text-xs font-mono font-black text-indigo-400 uppercase">
                    CARD DESIGN PLATFORM / ADD QUESTIONS ({manualCards.length} compiled)
                  </h4>
                </div>

                {/* SELECTING QUESTION FORMAT TYPE */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-450 uppercase block">Select Evaluation Format</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "identification", label: "Identification" },
                      { id: "multiple-choice", label: "Multiple Choice" },
                      { id: "true-false", label: "True or False" }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => { handleTick(); setCardType(type.id as any); }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          cardType === type.id
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONDITIONAL INPUT FIELDS BASED ON FORMAT */}
                <div className="space-y-4">
                  {/* QUESTION */}
                  <div className="space-y-1 bg-slate-950">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Question Prompt / Formula</label>
                    <input
                      type="text"
                      placeholder="e.g. What element has the chemical symbol Au?"
                      value={cardQ}
                      onChange={e => setCardQ(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* IDENTIFICATION INPUTS */}
                  {cardType === 'identification' && (
                    <div className="space-y-1 bg-slate-950">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Correct Answer (Matches case-insensitive text check)</label>
                      <input
                        type="text"
                        placeholder="e.g. Gold"
                        value={cardA}
                        onChange={e => setCardA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* TRUE OR FALSE INPUTS */}
                  {cardType === 'true-false' && (
                    <div className="space-y-1.5 bg-slate-950">
                      <label className="text-[10px] font-mono text-slate-400 uppercase block">Correct Answer Value</label>
                      <div className="flex gap-4">
                        {["True", "False"].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => { handleTick(); setTfCorrect(val as any); }}
                            className={`px-6 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              tfCorrect === val
                                ? "bg-emerald-600/25 border-emerald-500 text-emerald-300"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MULTIPLE CHOICE OPTIONS */}
                  {cardType === 'multiple-choice' && (
                    <div className="space-y-4 p-3 bg-slate-900/40 rounded-xl border border-slate-850/60">
                      <span className="text-[10px] font-mono text-indigo-300 uppercase block">Provide up to 4 Multiple Choice Options</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mcOptions.map((opt, i) => (
                          <div key={i} className="space-y-1">
                            <label className="text-[9px] font-mono text-slate-500 uppercase">Option {i + 1}</label>
                            <input
                              type="text"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={e => {
                                const copy = [...mcOptions];
                                copy[i] = e.target.value;
                                setMcOptions(copy);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block">Mark Correct Option</label>
                        <select
                          value={mcCorrectIdx}
                          onChange={e => setMcCorrectIdx(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value={0}>Option 1 correct ({mcOptions[0] || "Empty"})</option>
                          <option value={1}>Option 2 correct ({mcOptions[1] || "Empty"})</option>
                          <option value={2}>Option 3 correct ({mcOptions[2] || "Empty"})</option>
                          <option value={3}>Option 4 correct ({mcOptions[3] || "Empty"})</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* CLUE & EXPLANATION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 bg-slate-950">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Hint / Clue Mnemonic (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Symbol is Au from Latin word 'Aurum'"
                        value={cardClue}
                        onChange={e => setCardClue(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 bg-slate-950">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Factual Explanation (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Gold is a transition metal with atomic number 79, known historically..."
                        value={cardExpl}
                        onChange={e => setCardExpl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualCard}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-indigo-400 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Card to Artisan List
                </button>

                {/* PREVIEW OF ACCUMULATED CARDS */}
                {manualCards.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-slate-900/60 rounded-xl p-3 text-[10px] font-mono space-y-2 text-slate-400 border border-slate-850">
                    <span className="text-[9px] uppercase text-indigo-300 font-bold block mb-1">STAGED CARDS:</span>
                    {manualCards.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-950/40 last:border-0">
                        <div className="flex items-center gap-2 truncate">
                          <Check className="w-3 h-3 text-emerald-450 shrink-0" />
                          <span className="text-white font-semibold truncate max-w-xs">{c.question}</span>
                          <span>•</span>
                          <span className="text-indigo-400 uppercase font-bold text-[8px]">{c.questionType || 'identification'}</span>
                        </div>
                        <span className="text-slate-200 font-semibold text-right max-w-32 truncate">{c.answer}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={manualCards.length === 0}
                  className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-650 text-sm font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-950"
                >
                  Store Artisan Study Deck
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SCREEN: TIMED ACTIVE QUIZ DRIVER */}
        {activeScreen === 'quiz' && selectedDeck && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* CABINET UPPER ACTION BAR */}
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  handlePop();
                  if (timerRef.current) clearInterval(timerRef.current);
                  setActiveScreen('list');
                  setSelectedDeck(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 hover:text-white transition-all text-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Yield Deck</span>
              </button>

              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <span className="text-slate-550">TIMER: </span>
                <strong className="text-white text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                  {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s
                </strong>
              </div>

              <div className="text-xs font-mono">
                Hits: <strong className="text-emerald-400 text-sm">{scoreCount}</strong>/{selectedDeck.cards.length}
              </div>
            </div>

            {!isQuizComplete ? (
              /* ACTIVE INTERACTIVE CARD EVALUATION DRIVER */
              <div className="max-w-xl mx-auto space-y-6">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                  <span className="uppercase">Drill Progression Indicator</span>
                  <span>CARD {currentCardIdx + 1} OF {selectedDeck.cards.length}</span>
                </div>

                <div className="w-full h-1 bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-500" 
                    style={{ width: `${((currentCardIdx) / selectedDeck.cards.length) * 100}%` }} 
                  />
                </div>

                {/* THE PORTAL QUESTION DISPLAY */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl min-h-[300px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                        {selectedDeck.cards[currentCardIdx]?.questionType || 'identification'} Prompt
                      </span>
                      <Brain className="w-4 h-4 text-indigo-450" />
                    </div>

                    <h2 className="text-center text-lg md:text-xl font-bold text-white leading-relaxed font-sans py-4">
                      {selectedDeck.cards[currentCardIdx]?.question}
                    </h2>
                  </div>

                  {/* CHOICE SECTION BEFORE EVALUATION */}
                  {!hasCheckedAnswer ? (
                    <div className="py-4">
                      {/* IDENTIFICATION INPUT */}
                      {(selectedDeck.cards[currentCardIdx]?.questionType === 'identification' || !selectedDeck.cards[currentCardIdx]?.questionType) && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={userTypedAnswer}
                            onChange={e => setUserTypedAnswer(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && userTypedAnswer.trim()) handleCheckInteractive(userTypedAnswer); }}
                            placeholder="Type your answer target..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={!userTypedAnswer.trim()}
                            onClick={() => handleCheckInteractive(userTypedAnswer)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-xl cursor-pointer"
                          >
                            Verify Correctness
                          </button>
                        </div>
                      )}

                      {/* TRUE OR FALSE SELECTOR BUTTONS */}
                      {selectedDeck.cards[currentCardIdx]?.questionType === 'true-false' && (
                        <div className="grid grid-cols-2 gap-4">
                          {["True", "False"].map(choice => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => { setSelectedChoice(choice); handleCheckInteractive(choice); }}
                              className="py-3 bg-slate-950 hover:bg-indigo-950 border border-slate-805 hover:border-indigo-500/50 text-white font-bold rounded-xl text-center cursor-pointer transition-all"
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* MULTIPLE CHOICE GRID OPTIONS */}
                      {selectedDeck.cards[currentCardIdx]?.questionType === 'multiple-choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(selectedDeck.cards[currentCardIdx]?.options || []).map((choice, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => { setSelectedChoice(choice); handleCheckInteractive(choice); }}
                              className="py-3 px-4 bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/50 text-left text-xs font-semibold text-slate-200 rounded-xl transition-all block truncate"
                            >
                              <span className="font-mono text-indigo-400 mr-2 uppercase">{String.fromCharCode(65 + idx)}.</span>
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SHOWING WHAT IS CORRECT AND WRONG RESULTS SHEET INSIDE THE CARD */
                    <div className="py-4 space-y-4 border-t border-slate-850 pt-4 z-10 relative">
                      <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                        answeredCorrectly 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}>
                        <div className={`p-1.5 rounded-full shrink-0 ${answeredCorrectly ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                          {answeredCorrectly ? <Check className="w-4.5 h-4.5" /> : <X className="w-4.5 h-4.5" />}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold uppercase tracking-wider text-[10px]">
                            {answeredCorrectly ? "✓ Accurate Recall Verified" : "✗ Incorrect Recognition"}
                          </p>
                          <p className="text-slate-350">
                            <strong>Your Response:</strong> {userTypedAnswer || selectedChoice || "None"}
                          </p>
                          {!answeredCorrectly && (
                            <p className="font-bold text-white uppercase text-[10px] mt-1 tracking-wide">
                              ★ Correct Answer: <span className="text-emerald-400 underline">{selectedDeck.cards[currentCardIdx]?.answer}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* CLUE OR EXPLANATION BLOCK */}
                      {selectedDeck.cards[currentCardIdx]?.explanation && (
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/50 text-[11px] text-slate-400 leading-relaxed font-sans">
                          <strong>Note Explanation:</strong> {selectedDeck.cards[currentCardIdx]?.explanation}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleProceedNext}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md mt-2 cursor-pointer border-t border-white/10"
                      >
                        Continue to Next Question →
                      </button>
                    </div>
                  )}

                  {/* BOTTOM REVEAL FOOTER WITH HINT CUE */}
                  {!hasCheckedAnswer && (
                    <div className="border-t border-slate-850/50 pt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Respond above to verify metrics</span>
                      {selectedDeck.cards[currentCardIdx]?.clue && (
                        <button
                          type="button"
                          onClick={() => alert(`Clue: ${selectedDeck.cards[currentCardIdx]?.clue}`)}
                          className="text-indigo-400 hover:text-indigo-350 flex items-center gap-1 font-mono font-bold bg-indigo-950/20 px-2 rounded border border-indigo-900/30 text-[10px]"
                        >
                          <Lightbulb className="w-3 h-3" />
                          <span>Expose Hint Clue</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* DECK STUDY SESSION FINISHED SCOREBOARD SCREEN */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-6 shadow-xl"
              >
                <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">
                    Recalls Complete
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Study log metrics filed accurately to academic history.
                  </p>
                </div>

                {/* STATS MATRIX BOX */}
                <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Accuracy</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {Math.ceil((scoreCount / selectedDeck.cards.length) * 100)}%
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Recall Hits</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {scoreCount} / {selectedDeck.cards.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Elapsed Clock</span>
                    <span className="text-sm font-mono font-bold text-indigo-400">
                      {secondsElapsed}s
                    </span>
                  </div>
                </div>

                {/* CONTROLS */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => { handlePop(); setActiveScreen('list'); setSelectedDeck(null); }}
                    className="py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Cabinets View
                  </button>

                  <button
                    onClick={() => handleLaunchQuiz(selectedDeck)}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer border-t border-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Drill Again</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Overlap Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/30 text-rose-450 shrink-0">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-display font-black uppercase tracking-wider text-white">Confirmation Asked</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{confirmAction.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { handleTick(); setConfirmAction(null); }}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { handleChime(); confirmAction.onConfirm(); }}
                  className="px-3.5 py-1.5 bg-rose-650 hover:bg-rose-600 border border-rose-550/20 text-white rounded-lg text-xs font-semibold hover:scale-[1.02] transition-all cursor-pointer shadow-lg"
                >
                  Yes, Proceed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
