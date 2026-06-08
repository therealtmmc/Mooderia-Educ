import React, { useState, useRef, useEffect } from "react";
import { FolderCabinet, Material, QuizDeck, Flashcard } from "../types";
import { sound } from "../utils/sound";
import { 
  FolderPlus, FolderOpen, FileText, Camera, Volume2, Square, Play, Pause, 
  Trash2, Plus, Sparkles, BookOpen, Beaker, Code, GraduationCap, Music, 
  Feather, ArrowLeft, Mic, ChevronRight, Check, AlertCircle, RefreshCw, Pencil, Edit,
  Video, Image, Eye, Presentation
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createDirInOPFS } from "../utils/opfs";
import { uploadStudyFileLocally, runAIGeneratorAndSave, retrieveCachedStudySet } from "../firebase/hybridIntegration";

interface FoldersViewProps {
  folders: FolderCabinet[];
  setFolders: React.Dispatch<React.SetStateAction<FolderCabinet[]>>;
  onMaterialAdded: () => void;
  quizzes?: QuizDeck[];
  setQuizzes?: React.Dispatch<React.SetStateAction<QuizDeck[]>>;
  onNavigate?: (tab: 'folders' | 'quizzes' | 'profile' | 'analytics') => void;
}

const ICON_PRESETS = [
  { name: "BookOpen", component: BookOpen, label: "Literature / Science" },
  { name: "Beaker", component: Beaker, label: "Laboratory / Chem" },
  { name: "Code", component: Code, label: "Programming / CS" },
  { name: "GraduationCap", component: GraduationCap, label: "Academic Cap" },
  { name: "Music", component: Music, label: "Sonic / Arts" },
  { name: "Feather", component: Feather, label: "Writing / History" }
];

const COLOR_PRESETS = [
  { value: "violet", class: "bg-violet-600 border-violet-400 text-violet-400", hex: "#8b5cf6", glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]" },
  { value: "emerald", class: "bg-emerald-600 border-emerald-400 text-emerald-400", hex: "#10b981", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]" },
  { value: "rose", class: "bg-rose-600 border-rose-400 text-rose-400", hex: "#f43f5e", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]" },
  { value: "cyan", class: "bg-cyan-600 border-cyan-400 text-cyan-400", hex: "#06b6d4", glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]" },
  { value: "orange", class: "bg-orange-600 border-orange-400 text-orange-400", hex: "#f97316", glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]" },
  { value: "fuchsia", class: "bg-fuchsia-600 border-fuchsia-400 text-fuchsia-400", hex: "#d946ef", glow: "shadow-[0_0_15px_rgba(217,70,239,0.3)]" }
];

export default function FoldersView({ 
  folders, 
  setFolders, 
  onMaterialAdded, 
  quizzes, 
  setQuizzes, 
  onNavigate 
}: FoldersViewProps) {
  // Navigation & Cabinet Creation States
  const [selectedFolder, setSelectedFolder] = useState<FolderCabinet | null>(null);
  const [isCreatingCabinet, setIsCreatingCabinet] = useState(false);
  const [newCabinetName, setNewCabinetName] = useState("");
  const [newCabinetSubject, setNewCabinetSubject] = useState("");
  const [newCabinetDescription, setNewCabinetDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("BookOpen");
  const [selectedColor, setSelectedColor] = useState("violet");

  // Material Addition States
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [materialType, setMaterialType] = useState<Material['type']>('note');
  const [materialName, setMaterialName] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [uploadedBase64, setUploadedBase64] = useState<string | undefined>(undefined);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(undefined);
  const [uploadedFileType, setUploadedFileType] = useState<string>("");

  // AI Generation States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReportType, setAiReportType] = useState<'quiz' | 'flashcards' | null>(null);
  const [aiOperationSuccess, setAiOperationSuccess] = useState<boolean>(false);
  const [hasCachedStateCheck, setHasCachedStateCheck] = useState<boolean>(false);
  const [cachedContentStatus, setCachedContentStatus] = useState<string>("");

  // Material Preview Lightbox State
  const [previewingMaterial, setPreviewingMaterial] = useState<Material | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Synced state updates (to reflect if folders list modifies outside)
  const activeFolderInList = folders.find(f => f.id === selectedFolder?.id);
  const currentlyOpenedFolder = activeFolderInList || selectedFolder;

  // Cache effect to automatically inspect Firestore on file load
  useEffect(() => {
    if (!previewingMaterial) {
      setHasCachedStateCheck(false);
      setCachedContentStatus("");
      setAiOperationSuccess(false);
      return;
    }

    const checkCacheStatus = async () => {
      setHasCachedStateCheck(false);
      setCachedContentStatus("Analyzing localized database nodes...");
      try {
        const cached = await retrieveCachedStudySet(previewingMaterial.id);
        if (cached) {
          const modesSorted = [];
          if (cached.quiz && cached.quiz.length > 0) modesSorted.push("Academic Quiz");
          if (cached.flashcards && cached.flashcards.length > 0) modesSorted.push("Vocabulary Flashcards");
          
          if (modesSorted.length > 0) {
            setCachedContentStatus(`CACHE HIT! Located offline pre-concurred files: ${modesSorted.join(" & ")}`);
            setAiOperationSuccess(true);
          } else {
            setCachedContentStatus("Awaiting academic prompt execution to generate drills.");
          }
        } else {
          setCachedContentStatus("Awaiting academic prompt execution to generate drills.");
        }
      } catch (err) {
        console.warn("Cached state resolution issue:", err);
        setCachedContentStatus("Ready to compile academic prompts.");
      } finally {
        setHasCachedStateCheck(true);
      }
    };

    checkCacheStatus();
  }, [previewingMaterial]);

  const handleTriggerAIPipeline = async (mode: 'quiz' | 'flashcards') => {
    if (!previewingMaterial) return;
    setIsGeneratingAI(true);
    setAiReportType(mode);
    setAiOperationSuccess(false);
    handleChime();

    const textToProcess = previewingMaterial.textContent || `Study material regarding ${previewingMaterial.name}`;

    try {
      // 1. Initiate backend generation pipeline and Firestore cloud caching
      const data = await runAIGeneratorAndSave(
        previewingMaterial.id,
        textToProcess,
        mode,
        previewingMaterial.name,
        previewingMaterial.type
      );

      // 2. Synthesize and configure customized academic Deck models
      if (setQuizzes) {
        const generatedCards: Flashcard[] = data.map((item: any, idx: number) => ({
          id: `card_ai_${Date.now()}_${idx}`,
          question: mode === 'quiz' ? item.question : item.front,
          answer: mode === 'quiz' ? item.answer : item.back,
          strength: 0,
          questionType: mode === 'quiz' ? 'multiple-choice' : 'identification',
          options: mode === 'quiz' ? item.options : undefined
        }));

        const newDeck: QuizDeck = {
          id: `deck_ai_${previewingMaterial.id}_${mode}`,
          name: `🧠 ${previewingMaterial.name.replace(/\.[^/.]+$/, "")} (${mode === 'quiz' ? 'Quiz' : 'Cards'})`,
          description: `Generated dynamically via Academic Intelligence from: ${previewingMaterial.name}`,
          folderId: currentlyOpenedFolder?.id,
          cards: generatedCards,
          attemptsCount: 0,
          createdAt: new Date().toISOString()
        };

        setQuizzes(prev => {
          const loaded = prev.filter(d => d.id !== newDeck.id);
          return [newDeck, ...loaded];
        });
      }

      setAiOperationSuccess(true);
      setCachedContentStatus(`Success! Synced high-yield gamification sets inside Firestore Cache: 'study_sets/${previewingMaterial.id}'`);
    } catch (err) {
      console.error("[Academic Hub Fail]", err);
      alert("academic generation pipeline received offline constraints.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLaunchGame = () => {
    if (!previewingMaterial || !onNavigate) return;
    handleChime();
    setPreviewingMaterial(null);
    onNavigate('quizzes');
  };

  // Material Edit States
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingMaterialName, setEditingMaterialName] = useState("");
  const [editingMaterialContent, setEditingMaterialContent] = useState("");

  // Live Auditory Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceAnalysisData, setVoiceAnalysisData] = useState<number[]>(new Array(16).fill(10));
  
  // Audio playback simulator state
  const [playingMaterial, setPlayingMaterial] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Custom Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // References for Web Audio & interval timing
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup timers & streams on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Sound triggering functions
  const handlePop = () => sound.playPop();
  const handleTick = () => sound.playTick();
  const handleChime = () => sound.playChime();

  // Create a new Academic Cabinet Folder
  const handleCreateCabinet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCabinetName.trim() || !newCabinetSubject.trim()) return;

    const newCabinet: FolderCabinet = {
      id: "folder_" + Date.now(),
      name: newCabinetName,
      subject: newCabinetSubject,
      color: selectedColor,
      icon: selectedIcon,
      description: newCabinetDescription || undefined,
      materials: [],
      createdAt: new Date().toISOString()
    };

    // Safely create a local node in browser OPFS
    createDirInOPFS(newCabinet.id).catch(err => {
      console.warn("[OPFS Cabinet Sandbox] Not supported or failed to init:", err);
    });

    setFolders(prev => [newCabinet, ...prev]);
    setIsCreatingCabinet(false);
    setNewCabinetName("");
    setNewCabinetSubject("");
    setNewCabinetDescription("");
    handleChime();
  };

  // Delete an entire cabinet
  const handleDeleteCabinet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleTick();
    setConfirmAction({
      message: "Are you sure you want to permanently delete this academic cabinet? This will delete all of its notes, lecture audio, and files permanently.",
      onConfirm: () => {
        setFolders(prev => prev.filter(f => f.id !== id));
        if (selectedFolder?.id === id) {
          setSelectedFolder(null);
        }
        setConfirmAction(null);
      }
    });
  };

  // Toggle record simulated analysis or actual microphone capture
  const startRecording = async () => {
    handlePop();
    setRecordDuration(0);
    setIsRecording(true);
    
    // Attempt actual mic mapping for high-fidelity interactive feel
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const drawMockVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Downsample and process amplitudes
        const processedArray: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * 2] || 0;
          // Map 0-255 to dynamic bar heights (e.g. 5 to 70px)
          const h = 5 + (val / 255) * 65;
          processedArray.push(isMuted ? 5 : h);
        }
        setVoiceAnalysisData(processedArray);
        animationFrameRef.current = requestAnimationFrame(drawMockVisualizer);
      };
      
      drawMockVisualizer();
    } catch (e) {
      console.log("Using synthetic analysis loop:", e);
      // Fallback synthetic wave analyzer for safe preview container support
      const syntheticLoop = () => {
        const list: number[] = [];
        for (let i = 0; i < 16; i++) {
          const mod = Math.sin(Date.now() * 0.005 + i * 0.3) * 20;
          const amplitude = isMuted ? 5 : 20 + Math.random() * 25 + mod;
          list.push(Math.max(5, amplitude));
        }
        setVoiceAnalysisData(list);
        animationFrameRef.current = requestAnimationFrame(syntheticLoop);
      };
      syntheticLoop();
    }

    // Audio recording seconds counter
    recordIntervalRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    stopAllMedia();
    handleChime();
    
    // Pre-populate Voice Material notes
    setMaterialName(`Recorded Lecture - ${new Date().toLocaleDateString()}`);
    setMaterialContent(`Lecture capturing summary: Topics detailed inside a ${recordDuration}-second voice note recording captured at ${new Date().toLocaleTimeString()}.`);
  };

  const toggleMute = () => {
    handleTick();
    setIsMuted(prev => !prev);
  };

  // File drop/upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!currentlyOpenedFolder) {
      alert("Please open an academic folder first before uploading resources!");
      return;
    }

    try {
      console.log(`[FoldersView] Saving file "${file.name}" to Origin Private File System...`);
      // 1. Upload/save raw file strictly locally to OPFS and fetch instant DOM URL plus plain text
      const { url, extractedText } = await uploadStudyFileLocally(currentlyOpenedFolder.id, file);
      
      setUploadedUrl(url);
      setMaterialName(file.name);
      setMaterialContent(extractedText);

      // Detect material types and configure metadata previews
      const typeStr = file.type.toLowerCase();
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (typeStr.includes('pdf')) {
        setMaterialType('pdf');
        setUploadedFileType("PDF Document");
      } else if (typeStr.includes('image') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].some(ext => extension.includes(ext))) {
        setMaterialType('snapshot');
        setUploadedFileType("Snapshot Image");
      } else if (typeStr.includes('video') || ['.mp4', '.webm', '.ogg', '.mov'].some(ext => extension.includes(ext))) {
        setMaterialType('video');
        setUploadedFileType("Video Recording");
      } else if (typeStr.includes('presentation') || typeStr.includes('powerpoint') || ['.ppt', '.pptx', '.key'].some(ext => extension.includes(ext))) {
        setMaterialType('powerpoint');
        setUploadedFileType("Powerpoint Presentation");
      } else if (typeStr.includes('audio') || ['.mp3', '.wav', '.m4a', '.ogg', '.aac'].some(ext => extension.includes(ext))) {
        setMaterialType('audio_file');
        setUploadedFileType("Audio Cassette Recording");
      } else {
        setMaterialType('note');
        setUploadedFileType("Academic Draft File");
      }

      // Convert to a base64Data pointer for backwards compatibility in existing players
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string | undefined;
        if (base64) {
          setUploadedBase64(base64);
        }
      };
      reader.readAsDataURL(file);

      sound.playChime();
    } catch (err) {
      console.error("[FoldersView] Failed to process study asset locally in OPFS:", err);
      alert("Encrypted folder write failed. Checked browser OPFS permissions.");
    }
  };

  // Save the submitted study material to the active folder
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim() || !currentlyOpenedFolder) return;

    const newMaterial: Material = {
      id: "mat_" + Date.now(),
      name: materialName.trim(),
      type: materialType,
      textContent: materialContent.trim() || undefined,
      base64Data: uploadedBase64,
      url: uploadedUrl,
      durationSeconds: materialType === 'voice' ? (recordDuration || 120) : undefined,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => prev.map(f => {
      if (f.id === currentlyOpenedFolder.id) {
        return {
          ...f,
          materials: [newMaterial, ...f.materials]
        };
      }
      return f;
    }));

    // Reset Form
    setIsAddingMaterial(false);
    setMaterialName("");
    setMaterialContent("");
    setUploadedBase64(undefined);
    setUploadedUrl(undefined);
    setUploadedFileType("");
    setRecordDuration(0);
    handleChime();
    onMaterialAdded();
  };

  // Delete individual material
  const handleDeleteMaterial = (matId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleTick();
    setConfirmAction({
      message: "Are you sure you want to delete this study material from the folder?",
      onConfirm: () => {
        setFolders(prev => prev.map(f => {
          if (f.id === currentlyOpenedFolder?.id) {
            return {
              ...f,
              materials: f.materials.filter(m => m.id !== matId)
            };
          }
          return f;
        }));
        setConfirmAction(null);
      }
    });
  };

  // Start editing a material
  const handleStartEditMaterial = (mat: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    handlePop();
    setEditingMaterial(mat);
    setEditingMaterialName(mat.name);
    setEditingMaterialContent(mat.textContent || "");
  };

  // Save the edited material
  const handleSaveEditMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterialName.trim() || !currentlyOpenedFolder) return;

    setFolders(prev => prev.map(f => {
      if (f.id === currentlyOpenedFolder.id) {
        return {
          ...f,
          materials: f.materials.map(m => {
            if (m.id === editingMaterial.id) {
              return {
                ...m,
                name: editingMaterialName.trim(),
                textContent: editingMaterialContent.trim()
              };
            }
            return m;
          })
        };
      }
      return f;
    }));

    setEditingMaterial(null);
    setEditingMaterialName("");
    setEditingMaterialContent("");
    handleChime();
  };

  // Simulate Listening to Captured Voice Record Metrics
  const handleTogglePlayVoice = (mat: Material) => {
    if (playingMaterial === mat.id) {
      clearInterval(playbackIntervalRef.current!);
      setPlayingMaterial(null);
      handleTick();
    } else {
      handlePop();
      setPlayingMaterial(mat.id);
      setPlaybackProgress(0);
      
      const duration = mat.durationSeconds || 120;
      const step = 100 / duration;

      playbackIntervalRef.current = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            clearInterval(playbackIntervalRef.current!);
            setPlayingMaterial(null);
            handleChime();
            return 0;
          }
          return prev + step;
        });
      }, 1000);
    }
  };

  // Resolve Lucide Presets Dynamic Renders
  const renderIcon = (iconName: string, className = "w-6 h-6") => {
    const matched = ICON_PRESETS.find(p => p.name === iconName);
    const IconC = matched ? matched.component : BookOpen;
    return <IconC className={className} />;
  };

  // Get tailwind styling parameters by value metric
  const getColorClasses = (clr: string) => {
    const found = COLOR_PRESETS.find(p => p.value === clr);
    return found || COLOR_PRESETS[0];
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs uppercase font-mono tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">Cabinets DB</span>
          </div>
          <h1 className="text-3xl font-display font-display font-black tracking-tight text-white uppercase sm:text-4xl">
            Academic Folders
          </h1>
          <p className="text-sm text-slate-400 font-sans max-w-xl">
            Store subjects, record audio classes, and transcribe lecture summaries in organized physical structures.
          </p>
        </div>

        {!selectedFolder && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { handlePop(); setIsCreatingCabinet(true); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-indigo-900/40 relative overflow-hidden group cursor-pointer border-t border-white/15"
          >
            <FolderPlus className="w-5 h-5 group-hover:rotate-6 transition-transform" />
            <span>Create Cabinet</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* NEW CABINET WINDOW MODAL */}
        {isCreatingCabinet && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-slate-905 border border-purple-500/20 rounded-2xl p-6 glow-purple relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <FolderPlus className="w-48 h-48 text-violet-500" />
            </div>

            <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>Provision New Subject Cabinet</span>
            </h3>

            <form onSubmit={handleCreateCabinet} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Cabinet Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Molecular Biochemistry"
                    value={newCabinetName}
                    onChange={e => setNewCabinetName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Academic Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chem-320"
                    value={newCabinetSubject}
                    onChange={e => setNewCabinetSubject(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Course Description (Optional)</label>
                <textarea
                  placeholder="Summarize course goals, semester goals, or exam schedule..."
                  value={newCabinetDescription}
                  onChange={e => setNewCabinetDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* GRID INTERACTIVE PRESETS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* ICON SELECTOR */}
                <div>
                  <span className="block text-xs font-mono text-slate-400 uppercase mb-2">Subject Icon Badge</span>
                  <div className="grid grid-cols-6 gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                    {ICON_PRESETS.map(preset => {
                      const IconComp = preset.component;
                      const isSelected = selectedIcon === preset.name;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => { handleTick(); setSelectedIcon(preset.name); }}
                          title={preset.label}
                          className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                            isSelected 
                              ? "bg-purple-600 text-white shadow-lg" 
                              : "bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COLOR SELECTOR */}
                <div>
                  <span className="block text-xs font-mono text-slate-400 uppercase mb-2">Color Coding Tag</span>
                  <div className="grid grid-cols-6 gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                    {COLOR_PRESETS.map(preset => {
                      const isSelected = selectedColor === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => { handleTick(); setSelectedColor(preset.value); }}
                          className={`w-full h-9 rounded-lg flex items-center justify-center relative overflow-hidden transition-all ${preset.class}`}
                        >
                          {isSelected && (
                            <motion.div layoutId="colorCheck" className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                              <Check className="w-4 h-4" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { handleTick(); setIsCreatingCabinet(false); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all border-t border-white/20 shadow-lg shadow-purple-900/30 font-display"
                >
                  Confirm Creation
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* LIST OF FOLDERS STATS & CABINET CARDS */}
        {!selectedFolder ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {folders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-8 glow-indigo">
                <div className="mx-auto w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500 border border-slate-700/50">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-display font-medium text-white mb-1">No Academic Cabinets Present</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Begin your self-organization journey by creating your very first multi-format lecture folder.
                </p>
                <button
                  onClick={() => { handlePop(); setIsCreatingCabinet(true); }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white rounded-xl cursor-pointer"
                >
                  Add Subject Folder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {folders.map(folder => {
                    const palette = getColorClasses(folder.color);
                    return (
                      <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.18 } }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        onClick={() => { handlePop(); setSelectedFolder(folder); }}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer relative group flex flex-col justify-between min-h-[230px]"
                      >
                      {/* Glow top color code */}
                      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${palette.value === 'violet' ? 'from-violet-500 to-indigo-500' : palette.value === 'emerald' ? 'from-emerald-500 to-teal-500' : palette.value === 'rose' ? 'from-rose-500 to-pink-500' : palette.value === 'cyan' ? 'from-cyan-500 to-sky-500' : palette.value === 'orange' ? 'from-orange-500 to-amber-500' : 'from-fuchsia-500 to-purple-500'}`} />

                      {/* Accent glowing dot */}
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />

                      <div>
                        {/* Upper line metadata badge */}
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${palette.glow}`}>
                            {renderIcon(folder.icon, `w-5 h-5 text-${folder.color}-400`)}
                          </div>
                        </div>

                        {/* Title and stats using Bold Typography style */}
                        <h3 className="font-black uppercase text-lg leading-tight text-white group-hover:text-indigo-400 transition-colors">
                          {folder.name}<br/>
                          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{folder.subject}</span>
                        </h3>
                        {folder.description && (
                          <p className="text-xs text-slate-400 font-sans mt-3 line-clamp-2 h-8 leading-relaxed">
                            {folder.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-850/50 flex items-center justify-between">
                        <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold">
                          {folder.materials.length} MATERIALS / {folder.materials.filter(m => m.type === 'voice').length} AUDIO
                        </p>

                        {/* DELETE BUTTON */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteCabinet(folder.id, e)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-950/55 border border-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            title="Format Cabinet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          /* DETAILED SINGLE FOLDER DRAWER */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* CABINET UPPER ACTION BAR */}
            <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <button
                onClick={() => { handlePop(); setSelectedFolder(null); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>

              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${currentlyOpenedFolder ? getColorClasses(currentlyOpenedFolder.color).class : 'bg-purple-500 animate-pulse'}`} />
                <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                  Cabinet Console
                </h2>
              </div>

              <button
                onClick={() => { handlePop(); setIsAddingMaterial(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-650 hover:bg-purple-600 text-white text-xs font-semibold border-t border-purple-500/20 shadow transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Archive File</span>
              </button>
            </div>

            {/* CABINET DESCRIPTION DISPLAY */}
            {currentlyOpenedFolder && (
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                <div className={`absolute top-0 bottom-0 left-0 w-[4px] bg-${currentlyOpenedFolder.color}-500`} />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${getColorClasses(currentlyOpenedFolder.color).glow}`}>
                      {renderIcon(currentlyOpenedFolder.icon, `w-7 h-7 text-${currentlyOpenedFolder.color}-400`)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-400">
                          {currentlyOpenedFolder.subject}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Created {new Date(currentlyOpenedFolder.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="text-2xl font-display font-bold text-white mt-1">
                        {currentlyOpenedFolder.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        {currentlyOpenedFolder.description || "No supplemental details documented for this subject cabinet yet. Compile note logs and lecture cassettes below."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORM: NEW MATERIAL (INLINE CONSOLE) */}
            <AnimatePresence>
              {isAddingMaterial && currentlyOpenedFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-905 border border-purple-500/10 rounded-2xl p-6 glow-purple overflow-hidden"
                >
                  <h3 className="text-md font-display font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                    <span>Compile New Academic Material</span>
                  </h3>

                  <form onSubmit={handleSaveMaterial} className="space-y-4">
                    {/* SELECTOR FORMAT */}
                    <div>
                      <span className="block text-xs font-mono text-slate-400 uppercase mb-2">Material Type Format</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { type: 'note', label: 'Study Note', icon: FileText, desc: 'Interactive textbook summary text' },
                          { type: 'voice', label: 'Lecture Rec', icon: Mic, desc: 'Capture voice with visualizer stream' },
                          { type: 'pdf', label: 'PDF Summary', icon: GraduationCap, desc: 'Key references or syllabus segments' },
                          { type: 'snapshot', label: 'Snapshot', icon: Camera, desc: 'Board snapped or notes OCR block' }
                        ].map(item => {
                          const IconComp = item.icon;
                          const isSelected = materialType === item.type;
                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => { 
                                handlePop(); 
                                setMaterialType(item.type as any); 
                                if (item.type !== 'voice') {
                                  stopAllMedia();
                                  setIsRecording(false);
                                }
                              }}
                              className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all border ${
                                isSelected 
                                  ? "bg-purple-600/30 border-purple-500 text-white" 
                                  : "bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <IconComp className={`w-5 h-5 mb-1 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                              <span className="text-xs font-bold font-display">{item.label}</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 hidden sm:block">{item.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DRAG AND DROP FILE UPLOADER */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => {
                        const fileInput = document.getElementById('academic-file-picker');
                        if (fileInput) fileInput.click();
                      }}
                      className={`relative overflow-hidden cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                        isDraggingFile 
                          ? "border-purple-400 bg-purple-950/20 scale-[1.01]" 
                          : "border-slate-800 bg-slate-950/30 hover:bg-slate-900/40 hover:border-slate-750"
                      }`}
                    >
                      <input 
                        type="file" 
                        id="academic-file-picker"
                        className="hidden" 
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.ogg,.mov,.ppt,.pptx,.key,.mp3,.wav,.m4a,.aac"
                        onChange={handleFileChange}
                      />
                      
                      {uploadedBase64 ? (
                        <div className="space-y-3">
                          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950/30 border border-emerald-950/20 text-emerald-400 flex items-center justify-center animate-bounce">
                            <Check className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white font-display">
                              Loaded {uploadedFileType || "File"} Asset
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md mx-auto">
                              {materialName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedBase64(undefined);
                              setUploadedFileType("");
                              setMaterialName("");
                              setMaterialContent("");
                              handleTick();
                            }}
                            className="px-3 py-1 bg-rose-950/30 hover:bg-rose-950/50 text-rose-450 border border-rose-900/30 rounded-lg text-xs font-mono font-semibold transition-all inline-block"
                          >
                            Clear File
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mx-auto w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 text-purple-400 flex items-center justify-center shadow-inner">
                            <Plus className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider font-display">
                              Drag &amp; Drop or Click to Upload File
                            </p>
                            <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto leading-relaxed">
                              Supports <span className="text-purple-305 font-bold">PDF, Images (Photos), Videos, PowerPoints,</span> and <span className="text-rose-405 font-bold">Audio records</span>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INTERACTIVE VOICE MEMO RECORDER SECTION */}
                    {materialType === 'voice' && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                            <span className="text-xs font-mono text-slate-300 font-semibold">
                              {isRecording ? "CAPTURE STATE: LIVE TRANSCRIBER STREAMING" : "CAPSULE DISCHARGED - READY"}
                            </span>
                          </div>

                          <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 border border-slate-800 rounded font-bold text-white">
                            Time: {Math.floor(recordDuration / 60)}m {recordDuration % 60}s
                          </span>
                        </div>

                        {/* HIGH-FIDELITY DYNAMIC WAVE BAR VISUALIZER */}
                        <div className="h-20 bg-slate-900/50 border border-slate-850/60 rounded-xl flex items-center justify-center gap-1 px-4 relative overflow-hidden">
                          {isRecording ? (
                            voiceAnalysisData.map((height, index) => (
                              <motion.div
                                key={index}
                                animate={{ height: `${height}px` }}
                                transition={{ type: "spring", stiffness: 350, damping: 15 }}
                                className={`w-1.5 rounded-full ${isMuted ? 'bg-slate-700' : 'bg-gradient-to-t from-purple-600 to-cyan-400'}`}
                              />
                            ))
                          ) : (
                            <div className="text-center">
                              <Volume2 className="w-5 h-5 text-slate-600 mx-auto mb-1 animate-pulse" />
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Awaiting Audio Frame Initialization</span>
                            </div>
                          )}

                          {isMuted && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                              <span className="text-xs font-mono text-rose-400 font-semibold flex items-center gap-1.5 uppercase">
                                <AlertCircle className="w-4 h-4" /> Sound Line Suspended (MUTED)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* RECORDER CONTROLS */}
                        <div className="flex justify-center gap-3">
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-display flex items-center gap-2 shadow-lg shadow-rose-950/40 border-t border-rose-450 cursor-pointer"
                            >
                              <Mic className="w-4 h-4 animate-pulse" />
                              <span>Initialize Lecture Capture</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={toggleMute}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border font-mono cursor-pointer ${
                                  isMuted 
                                    ? "bg-rose-950 border-rose-800 text-rose-300" 
                                    : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {isMuted ? "Unmute Mic" : "Mute Line"}
                              </button>

                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-5 py-2 rounded-lg bg-slate-100 text-slate-950 text-xs font-bold font-display flex items-center gap-2 cursor-pointer"
                              >
                                <Square className="w-4 h-4 text-rose-600 fill-rose-600" />
                                <span>Terminate & Log Memory</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-slate-400 uppercase">Material Filename</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ribosome Translation Pathway"
                          value={materialName}
                          onChange={e => setMaterialName(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-mono text-slate-400 uppercase">Tag Descriptor</label>
                        <span className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-2.5 text-slate-500 outline-none flex items-center gap-2 text-xs">
                          <Check className="w-4 h-4 text-emerald-400" /> Auto-cataloged in {currentlyOpenedFolder.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">
                        {materialType === 'note' ? "Syllabus Notes / Lecture Text Transcript" : materialType === 'pdf' ? "PDF Text Content Excerpts" : materialType === 'snapshot' ? "Snap OCR Text Data" : "Audio Note Transcript Summaries (Optional)"}
                      </label>
                      <textarea
                        required={materialType !== 'voice'}
                        placeholder={materialType === 'note' ? "Compose organic summary notes, formulas, or copy-paste lecture excerpts directly..." : "Add text summaries, transcripts, or notes..."}
                        value={materialContent}
                        onChange={e => setMaterialContent(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none font-sans text-xs"
                      />
                    </div>

                    {/* SUBMIT BUTTONS */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { handleTick(); setIsAddingMaterial(false); }}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all border border-slate-800 cursor-pointer"
                      >
                        Abrogate
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-all border-t border-white/20 shadow-lg font-display cursor-pointer"
                      >
                        Archive Material
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FORM: EDIT MATERIAL */}
            <AnimatePresence>
              {editingMaterial && currentlyOpenedFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-905 border border-indigo-500/10 rounded-2xl p-6 shadow-xl overflow-hidden my-4"
                >
                  <h3 className="text-md font-display font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                    <span>Edit Study Material / File</span>
                  </h3>

                  <form onSubmit={handleSaveEditMaterial} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-slate-400 uppercase">Material Filename</label>
                        <input
                          type="text"
                          required
                          value={editingMaterialName}
                          onChange={e => setEditingMaterialName(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-mono text-slate-400 uppercase">Tag Descriptor</label>
                        <span className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-2.5 text-slate-500 outline-none flex items-center gap-2 text-xs">
                          <Check className="w-4 h-4 text-emerald-400" /> Editing file in {currentlyOpenedFolder.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">
                        Syllabus Notes / Lecture Text Transcript / File Content
                      </label>
                      <textarea
                        required
                        value={editingMaterialContent}
                        onChange={e => setEditingMaterialContent(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-sans text-xs"
                      />
                    </div>

                    {/* SUBMIT BUTTONS */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { handleTick(); setEditingMaterial(null); }}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all border border-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-lg transition-all border-t border-white/20 shadow-lg font-display cursor-pointer"
                      >
                        Save Corrections
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LIST OF STUDY MATERIALS INSIDE CABINET */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-medium text-white uppercase tracking-wider">
                  Archived Assets Index
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
                  {currentlyOpenedFolder?.materials.length || 0} File{currentlyOpenedFolder?.materials.length === 1 ? "" : "s"} Catalogs
                </span>
              </div>

              {!currentlyOpenedFolder || currentlyOpenedFolder.materials.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/10 border border-slate-850 rounded-2xl p-6">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Cabinet Empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No active transcripts, lecture voice recordings, or textbooks indexed. Launch the compilation console above to log notes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <AnimatePresence mode="popLayout">
                    {currentlyOpenedFolder.materials.map(mat => {
                      const isVoicePlaying = playingMaterial === mat.id;
                      return (
                        <motion.div
                          key={mat.id}
                          layout
                          initial={{ opacity: 0, y: 15, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.15 } }}
                          transition={{ duration: 0.22 }}
                          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                        <div className="flex items-start gap-3.5">
                          {/* File type icon representation */}
                          <div className={`p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center ${
                            mat.type === 'voice' || mat.type === 'audio_file' ? 'bg-rose-950/20 text-rose-450 border-rose-900/30' : 
                            mat.type === 'video' ? 'bg-cyan-950/20 text-cyan-400 border-cyan-900/30' :
                            mat.type === 'powerpoint' ? 'bg-orange-950/20 text-orange-450 border-orange-900/30' :
                            'text-purple-405'
                          }`}>
                            {mat.type === 'note' && <FileText className="w-5 h-5" />}
                            {mat.type === 'voice' && <Mic className="w-5 h-5" />}
                            {mat.type === 'pdf' && <BookOpen className="w-5 h-5" />}
                            {mat.type === 'snapshot' && <Image className="w-5 h-5" />}
                            {mat.type === 'video' && <Video className="w-5 h-5" />}
                            {mat.type === 'powerpoint' && <Presentation className="w-5 h-5" />}
                            {mat.type === 'audio_file' && <Music className="w-5 h-5" />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white group-hover:text-purple-300">
                                {mat.name}
                              </span>
                              <span className={`text-[9.5px] font-mono uppercase font-bold px-1.5 py-0.5 border rounded ${
                                mat.type === 'voice' ? 'bg-rose-950/30 border-rose-800/40 text-rose-400' :
                                mat.type === 'audio_file' ? 'bg-rose-950/30 border-rose-800/40 text-rose-400' :
                                mat.type === 'video' ? 'bg-cyan-950/30 border-cyan-800/40 text-cyan-400' :
                                mat.type === 'powerpoint' ? 'bg-orange-950/30 border-orange-850/40 text-orange-400' :
                                mat.type === 'pdf' ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-400' :
                                'bg-slate-950 border-slate-800 text-slate-400'
                              }`}>
                                {mat.type === 'voice' ? "Lect Rec" : 
                                 mat.type === 'audio_file' ? "Audio File" : 
                                 mat.type === 'video' ? "Video" : 
                                 mat.type === 'powerpoint' ? "PPT Deck" : 
                                 mat.type === 'snapshot' ? "Image" : mat.type}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-450 font-sans leading-relaxed line-clamp-3">
                              {mat.textContent}
                            </p>

                            <div className="flex items-center gap-2 pt-1 font-mono text-[9px] text-slate-500">
                              <span>Logged {new Date(mat.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>UID: {mat.id.substring(4, 9)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive operations side */}
                        <div className="flex items-center gap-2 justify-end md:shrink-0 border-t md:border-t-0 border-slate-800 pt-2.5 md:pt-0">
                          {mat.type === 'voice' && (
                            <div className="flex flex-col items-end gap-1 font-mono mr-1">
                              <button
                                onClick={() => handleTogglePlayVoice(mat)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  isVoicePlaying 
                                    ? "bg-rose-600 text-white shadow-lg" 
                                    : "bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300"
                                }`}
                              >
                                {isVoicePlaying ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5 fill-current animate-pulse" />
                                    <span>Playing {Math.ceil(playbackProgress)}%</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current text-rose-500" />
                                    <span>Play Cassette</span>
                                  </>
                                )}
                              </button>
                              
                              {/* Inline mini wave simulation for cassette */}
                              {isVoicePlaying && (
                                <div className="w-24 h-1 bg-slate-950 border border-slate-800 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full bg-rose-500 transition-all duration-300" 
                                    style={{ width: `${playbackProgress}%` }} 
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => { handlePop(); setPreviewingMaterial(mat); }}
                            className="p-2 bg-slate-950 hover:bg-emerald-950/40 border border-slate-850 hover:border-emerald-900/30 text-slate-500 hover:text-emerald-400 rounded-lg transition-all"
                            title="Preview / View File Asset"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleStartEditMaterial(mat, e)}
                            className="p-2 bg-slate-950 hover:bg-indigo-950/40 border border-slate-850 hover:border-indigo-900/30 text-slate-500 hover:text-indigo-400 rounded-lg transition-all"
                            title="Edit File"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteMaterial(mat.id, e)}
                            className="p-2 bg-slate-950 hover:bg-rose-950/40 border border-slate-850 hover:border-rose-900/30 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            title="Format File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Media / Asset Previewer Lightbox */}
      <AnimatePresence>
        {previewingMaterial && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto"
            >
              {/* HEADER CAPTION */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950/50 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400`}>
                    {previewingMaterial.type === 'note' && <FileText className="w-5 h-5" />}
                    {previewingMaterial.type === 'voice' && <Mic className="w-5 h-5" />}
                    {previewingMaterial.type === 'pdf' && <BookOpen className="w-5 h-5" />}
                    {previewingMaterial.type === 'snapshot' && <Image className="w-5 h-5" />}
                    {previewingMaterial.type === 'video' && <Video className="w-5 h-5 animate-pulse" />}
                    {previewingMaterial.type === 'powerpoint' && <Presentation className="w-5 h-5" />}
                    {previewingMaterial.type === 'audio_file' && <Music className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-display font-extrabold text-white tracking-wide max-w-sm md:max-w-xl truncate">
                      {previewingMaterial.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                      Academic Core File • Logged {new Date(previewingMaterial.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { handleTick(); setPreviewingMaterial(null); setPreviewSlideIndex(0); }}
                  className="p-1 px-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs leading-none font-semibold transition-all cursor-pointer"
                >
                  ✕ Close Frame
                </button>
              </div>

              {/* DYNAMIC PLAYER VIEWPORTS */}
              <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4">
                {/* 1. PDF DOCUMENT DETROLLER */}
                {previewingMaterial.type === 'pdf' && (
                  <div className="space-y-4">
                    {previewingMaterial.base64Data ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
                        <iframe 
                          src={previewingMaterial.base64Data} 
                          className="w-full h-[500px]" 
                          title={previewingMaterial.name}
                        />
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60">
                        <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-white">Syllabus PDF Preview Mockup</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          This element is cataloged as a PDF reference. Direct textbook texts was parsed cleanly.
                        </p>
                      </div>
                    )}
                    
                    {previewingMaterial.textContent && (
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs text-left leading-relaxed text-slate-300">
                        <label className="text-[10px] uppercase font-mono text-indigo-400 font-bold block mb-2">Parsed Document Text Summary</label>
                        <p className="whitespace-pre-line">{previewingMaterial.textContent}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SNAPSHOT PHOTO VIEWER */}
                {previewingMaterial.type === 'snapshot' && (
                  <div className="space-y-4 text-center">
                    {previewingMaterial.base64Data ? (
                      <div className="relative inline-block max-w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                        <img 
                          src={previewingMaterial.base64Data} 
                          className="max-h-[500px] object-contain mx-auto" 
                          referrerPolicy="no-referrer"
                          alt={previewingMaterial.name}
                        />
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60">
                        <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-white">Note Photo Asset</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          This photograph asset lists visual formula guides or written whiteboards.
                        </p>
                      </div>
                    )}
                    
                    {previewingMaterial.textContent && (
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs text-left leading-relaxed text-slate-300 max-w-2xl mx-auto">
                        <label className="text-[10px] uppercase font-mono text-purple-400 font-bold block mb-2">OCR Transcribed Text Data</label>
                        <p className="whitespace-pre-line">{previewingMaterial.textContent}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. VIDEO PLATFORM THEATER */}
                {previewingMaterial.type === 'video' && (
                  <div className="space-y-4">
                    {previewingMaterial.base64Data ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                        <video 
                          src={previewingMaterial.base64Data} 
                          controls 
                          autoPlay
                          className="w-full max-h-[500px]" 
                        />
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60">
                        <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-white">Lecture Video Footage</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Uploaded tutorial or whiteboard video recording has been captured under keynotes indexing.
                        </p>
                      </div>
                    )}
                    
                    {previewingMaterial.textContent && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs text-left leading-relaxed text-slate-300">
                        <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold block mb-1.5">Video Transcription / Log</label>
                        <p>{previewingMaterial.textContent}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. RECALL AUDIO CASSETTE PLAYER */}
                {(previewingMaterial.type === 'voice' || previewingMaterial.type === 'audio_file') && (
                  <div className="max-w-md mx-auto space-y-6 py-4">
                    {/* Retro Cassette Shell Graphic rendering */}
                    <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 border-4 border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden space-y-4">
                      {/* Cassette label area */}
                      <div className="bg-orange-600/10 border border-orange-500/10 p-4 rounded-xl text-center relative">
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse" />
                          <span className="text-[8px] font-mono text-slate-500 flex items-center gap-0.5">A</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-orange-400 tracking-wider">
                          {previewingMaterial.type === 'voice' ? "LECTURE AUDIO CASSETTE" : "SONIC FILE REFERENCE"}
                        </span>
                        <div className="text-[10px] font-mono text-slate-300 truncate mt-1 bg-slate-950/40 py-1 px-2 rounded border border-slate-850">
                          {previewingMaterial.name}
                        </div>
                      </div>

                      {/* Animated Spinning Tape Wheels */}
                      <div className="flex items-center justify-around py-4">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-755 bg-slate-950 flex items-center justify-center relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 3 }}
                            className="w-6 h-6 border-2 border-dashed border-slate-550 rounded-full"
                          />
                        </div>
                        <div className="w-10 h-1 border-t-2 border-dashed border-slate-800" />
                        <div className="w-12 h-12 rounded-full border-4 border-slate-755 bg-slate-950 flex items-center justify-center relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 3 }}
                            className="w-6 h-6 border-2 border-dashed border-slate-550 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Native HTML5 Audio Controller bar */}
                      {previewingMaterial.base64Data ? (
                        <div className="pt-2">
                          <audio 
                            src={previewingMaterial.base64Data} 
                            controls 
                            autoPlay
                            className="w-full h-8 outline-none filter invert"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-550 font-mono">
                          Simulated Voice Tape • Duration Count: {previewingMaterial.durationSeconds || 120} Secs
                        </div>
                      )}
                    </div>

                    {previewingMaterial.textContent && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs text-left leading-relaxed text-slate-400 font-sans">
                        <label className="text-[10px] uppercase font-mono text-rose-400 font-bold block mb-1">Cassette Transcribed Summary</label>
                        <p>{previewingMaterial.textContent}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. INTERACTIVE POWERPOINT PRESENTATION SLIDESHOW */}
                {previewingMaterial.type === 'powerpoint' && (() => {
                  // Construct dynamic 5-slide training slide lists based on the files content
                  const slideTitles = [
                    "Introduction & Academic Fundamentals",
                    "Core Hypothesis Statements",
                    "Structural Concepts & Key Metrics",
                    "Supplemental Lecture Visualizations",
                    "Interactive Flashcard Recall Review"
                  ];
                  
                  const slideExcerpts = [
                    previewingMaterial.name, 
                    previewingMaterial.textContent || "Theoretical framework overview derived from the textbook segments uploaded.",
                    "Syllabus core points highlighting detailed subject metrics and lecture parameters.",
                    "Skeletal flowcharts detailing concepts dynamically aligned inside the system memory.",
                    "Review completed. Select Flashcard Decks view inside the Main dashboard to start quizzes."
                  ];

                  const totalSlides = slideTitles.length;

                  return (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      {/* 16:9 Slide Canvas Board */}
                      <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl border-2 border-slate-800 p-8 md:p-12 relative flex flex-col justify-between shadow-2xl overflow-hidden group">
                        
                        {/* Slide background glow grids */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
                        
                        {/* Slide header brand */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <span className="text-[9px] font-mono text-orange-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                            Academic Keynote Slide deck
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Slide {previewSlideIndex + 1} of {totalSlides}
                          </span>
                        </div>

                        {/* Animated Slide Content transition flow */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={previewSlideIndex}
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="my-auto py-4 text-center space-y-4 relative z-10"
                          >
                            <h2 className="text-lg md:text-xl font-display font-black tracking-tight text-white max-w-lg mx-auto leading-tight">
                              {slideTitles[previewSlideIndex]}
                            </h2>
                            <p className="text-xs text-slate-350 max-w-md mx-auto leading-relaxed">
                              {slideExcerpts[previewSlideIndex]}
                            </p>
                          </motion.div>
                        </AnimatePresence>

                        {/* Slide footer indicators */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto font-mono text-[9px] text-slate-500 relative z-10">
                          <span>Presenter Ref: AI Studio Smart Viewer</span>
                          <span className="truncate max-w-[200px]">{previewingMaterial.name}</span>
                        </div>
                      </div>

                      {/* PowerPoint Navigation toolbar controllers */}
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <button
                          type="button"
                          disabled={previewSlideIndex === 0}
                          onClick={() => { handlePop(); setPreviewSlideIndex(prev => Math.max(0, prev - 1)); }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                            previewSlideIndex === 0 
                              ? "text-slate-600 bg-slate-900/40 border border-slate-850/40" 
                              : "text-white bg-slate-900 hover:bg-slate-800 border border-slate-800"
                          }`}
                        >
                          ◀ Left Slide
                        </button>

                        {/* Progress Indicators */}
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: totalSlides }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { handleTick(); setPreviewSlideIndex(i); }}
                              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                                previewSlideIndex === i ? "bg-orange-500 scale-125 shadow-lg shadow-orange-950" : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={previewSlideIndex === totalSlides - 1}
                          onClick={() => { handlePop(); setPreviewSlideIndex(prev => Math.min(totalSlides - 1, prev + 1)); }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                            previewSlideIndex === totalSlides - 1 
                              ? "text-slate-600 bg-slate-900/40 border border-slate-850/40" 
                              : "text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 animate-pulse"
                          }`}
                        >
                          Right Slide ▶
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 6. PLAIN STUDY NOTE TEXT WRAP */}
                {previewingMaterial.type === 'note' && (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <FileText className="w-4.5 h-4.5 text-purple-400" />
                      <span className="text-xs uppercase font-mono font-bold tracking-wide text-slate-400">Class Supplemental Note Syllabus</span>
                    </div>
                    <p className="text-xs text-slate-250 text-left leading-relaxed whitespace-pre-line font-sans">
                      {previewingMaterial.textContent || "No text summary has been documented inside this academic card index."}
                    </p>
                  </div>
                )}

                {/* 🧠 AI BRAIN ACCELERATORS & HYBRID RECALLS */}
                <div className="bg-slate-950/60 border border-purple-500/25 p-5 rounded-2xl glow-purple text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        AI Cognitive Accelerator Hub
                      </h4>
                    </div>

                    {hasCachedStateCheck ? (
                      <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-lg font-bold flex items-center gap-1.5 ${
                        aiOperationSuccess 
                          ? "bg-emerald-950/45 border-emerald-900/40 text-emerald-400" 
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {aiOperationSuccess ? "SECURE CACHE ACTIVE" : "AWAITING PROMPT"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-purple-450 animate-pulse">
                        Scanning Cloud Logs...
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-xl">
                    Our hybrid engine acts as a bridge. Raw lecture assets remain cached securely on your local machine ({previewingMaterial.url ? "OPFS Vault" : "Memory Pool"}). High-yield study sets and scores synchronize to Firebase automatically.
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-900 leading-snug">
                    <span className="text-purple-400 font-bold">Pipeline Status:</span> {cachedContentStatus || "System initialized. Core templates compiled."}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* OPTION 1: HIGH-YIELD ACADEMIC QUIZ */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h5 className="text-xs font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Beaker className="w-4 h-4 text-violet-400" />
                          <span>Spaced-Repetition Quiz</span>
                        </h5>
                        <p className="text-[10px] text-slate-450 mt-1 leading-normal font-sans">
                          Build complex multiple-choice drills with custom question distractor items derived from textbook text.
                        </p>
                      </div>

                      <div className="pt-2">
                        {isGeneratingAI && aiReportType === 'quiz' ? (
                          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 pt-1">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                            <span>Accelerating prompts...</span>
                          </div>
                        ) : aiOperationSuccess ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchGame()}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 font-display text-xs font-semibold rounded-lg text-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity border-t border-white/10"
                          >
                            ⚡ Run Quiz Recall (Cache Active)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerAIPipeline('quiz')}
                            className="w-full py-2 bg-purple-650 hover:bg-purple-605 text-[11px] font-semibold rounded-lg text-white cursor-pointer transition-all border-t border-white/15"
                          >
                            Compile High-Yield Quiz
                          </button>
                        )}
                      </div>
                    </div>

                    {/* OPTION 2: MULTI-LEVEL VOCABULARY FLASHCARDS */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <h5 className="text-xs font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-pink-400" />
                          <span>Vocab Flashcard Deck</span>
                        </h5>
                        <p className="text-[10px] text-slate-450 mt-1 leading-normal font-sans">
                          Auto-extract core high-yield terms, formulas, and textbook definitions onto physical review cards.
                        </p>
                      </div>

                      <div className="pt-2">
                        {isGeneratingAI && aiReportType === 'flashcards' ? (
                          <div className="flex items-center gap-2 text-xs font-mono text-pink-450 pt-1">
                            <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                            <span>Accelerating prompts...</span>
                          </div>
                        ) : aiOperationSuccess ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchGame()}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 font-display text-xs font-semibold rounded-lg text-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity border-t border-white/10"
                          >
                            ⚡ Launch Flashcard Recall (Cache Active)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerAIPipeline('flashcards')}
                            className="w-full py-2 bg-purple-650 hover:bg-purple-605 text-[11px] font-semibold rounded-lg text-white cursor-pointer transition-all border-t border-white/15"
                          >
                            Extract Vocab Flashcards
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  Secured station file preview engine
                </span>
                <button
                  type="button"
                  onClick={() => { handleTick(); setPreviewingMaterial(null); setPreviewSlideIndex(0); }}
                  className="px-5 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold hover:scale-[1.02] transition-all cursor-pointer shadow-lg border-t border-white/10"
                >
                  Confirm &amp; Proceed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
