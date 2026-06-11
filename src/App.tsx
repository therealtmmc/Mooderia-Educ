import React, { useState, useEffect } from "react";
import { FolderCabinet, QuizDeck, QuizAttempt, StudentIdentity } from "./types";
import { 
  initialProfile, initialFolders, initialQuizzes, initialAttempts 
} from "./utils/dummyData";
import { sound } from "./utils/sound";
import FoldersView from "./components/FoldersView";
import QuizzesView from "./components/QuizzesView";
import ArenaView from "./components/ArenaView";
import ProfileView from "./components/ProfileView";
import AnalyticsView from "./components/AnalyticsView";
import SignInView from "./components/SignInView";
import OnboardingModal from "./components/OnboardingModal";
import MobileRestrictionView from "./components/MobileRestrictionView";
import DesktopLandingView from "./components/DesktopLandingView";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { checkUserDocExists } from "./firebase/authService";
import { doc, getDoc } from "firebase/firestore";
import { 
  FolderOpen, Brain, User, BarChart2, Volume2, VolumeX, ShieldCheck, Sparkles, Laptop, Smartphone, Tablet, Gamepad2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if it's already caught by main.tsx
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
      });
    } else {
      alert("To install the app:\n\n📱 iOS / Safari:\nTap the Share icon at the bottom, then select 'Add to Home Screen'.\n\n🤖 Android / Chrome:\nTap the 3-dots menu at the top right, then select 'Add to Home screen' or 'Install App'.");
    }
  };

  // PERSISTENCE STATE ENGINE
  const [profile, setProfile] = useState<StudentIdentity>(() => {
    const saved = localStorage.getItem("mooderia_profile");
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [folders, setFolders] = useState<FolderCabinet[]>(() => {
    try {
      const profSaved = localStorage.getItem("mooderia_profile");
      if (profSaved) {
        const p = JSON.parse(profSaved);
        if (p.signedIn) {
          const saved = localStorage.getItem("mooderia_folders");
          if (saved) {
            const list = JSON.parse(saved);
            return list.filter((f: any) => f.id !== "f1" && f.id !== "f2" && f.id !== "f3");
          }
          return [];
        }
      }
    } catch (e) {}
    const saved = localStorage.getItem("mooderia_folders");
    if (saved) return JSON.parse(saved);
    return initialFolders;
  });

  const [quizzes, setQuizzes] = useState<QuizDeck[]>(() => {
    try {
      const profSaved = localStorage.getItem("mooderia_profile");
      if (profSaved) {
        const p = JSON.parse(profSaved);
        if (p.signedIn) {
          const saved = localStorage.getItem("mooderia_quizzes");
          if (saved) {
            const list = JSON.parse(saved);
            return list.filter((q: any) => q.id !== "q1" && q.id !== "q2");
          }
          return [];
        }
      }
    } catch (e) {}
    const saved = localStorage.getItem("mooderia_quizzes");
    if (saved) return JSON.parse(saved);
    return initialQuizzes;
  });

  const [attempts, setAttempts] = useState<QuizAttempt[]>(() => {
    try {
      const profSaved = localStorage.getItem("mooderia_profile");
      if (profSaved) {
        const p = JSON.parse(profSaved);
        if (p.signedIn) {
          const saved = localStorage.getItem("mooderia_attempts");
          if (saved) {
            const list = JSON.parse(saved);
            return list.filter((a: any) => !a.id.startsWith("att_") && a.id !== "att_1" && a.id !== "att_2" && a.id !== "att_3" && a.id !== "att_4");
          }
          return [];
        }
      }
    } catch (e) {}
    const saved = localStorage.getItem("mooderia_attempts");
    if (saved) return JSON.parse(saved);
    return initialAttempts;
  });


  // NAV SCREEN CONTROL
  const [activeTab, setActiveTab] = useState<'folders' | 'quizzes' | 'profile' | 'analytics' | 'arena'>('folders');
  
  // SPLASH LOADING INTRO SCREEN
  const [showSplash, setShowSplash] = useState(true);

  // DESKTOP LANDING SCREEN STATE
  const [hasPassedDesktopLanding, setPassedDesktopLanding] = useState(() => {
    const saved = localStorage.getItem("mooderia_desktop_landing_passed");
    return saved === "true";
  });

  // FIREBASE USER SESSION STATES
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await user.reload();
        } catch (e) {
          console.error("Failed to reload user session state:", e);
        }
        
        if (user.emailVerified) {
          const exists = await checkUserDocExists(user.uid);
          if (exists) {
            try {
              const snap = await getDoc(doc(db, "users", user.uid));
              if (snap.exists()) {
                const data = snap.data();
                const avatarKey = `mooderia_custom_avatar_${user.uid}`;
                const savedAvatar = localStorage.getItem(avatarKey) || undefined;
                setProfile({
                  name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Student Scholar",
                  studentId: data.uid,
                  institution: data.university || "Academic Institution",
                  gradeLevel: data.year || "1st Year",
                  avatarEmoji: data.avatar_emoji || "🤖",
                  avatarGradientStart: "from-indigo-600",
                  avatarGradientEnd: "to-fuchsia-600",
                  avatarUrl: savedAvatar,
                  university: data.university || "Academic Institution",
                  program: data.program || "Academic Program",
                  year: data.year || "1st Year",
                  signedIn: true
                });
                setIsOnboardingActive(false);
              }
            } catch (e) {
              console.error("Retrieve profile properties failed: ", e);
            }
          } else {
            setIsOnboardingActive(true);
          }
        } else {
          setIsOnboardingActive(false);
        }
      } else {
        setProfile(prev => ({ ...prev, signedIn: false }));
        setIsOnboardingActive(false);
      }
      setFirebaseLoading(false);
    });
    return unsubscribe;
  }, []);

  // ONLINE/OFFLINE DETECT ENGINE
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // SOUND TOGGLER
  const [soundOn, setSoundOn] = useState(() => {
    const saved = localStorage.getItem("mooderia_sound_on");
    return saved !== "false";
  });

  // DYNAMIC DEVICE LAYOUT STATE ENGINE (Phone vs Tablet vs Laptop)
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'laptop'>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 768) return 'phone';
      if (width < 1024) return 'tablet';
      return 'laptop';
    }
    return 'laptop';
  });

  const [isMobileOS, setIsMobileOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /android|ipad|iphone|ipod/i.test(ua);
  });

  const [isAppEnv, setIsAppEnv] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    const ua = navigator.userAgent || '';
    // Detect typical Android WebViews and PWA standalone mode
    const isWv = /(wv|WebView|Android.*Version\/)/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isApkParam = new URLSearchParams(window.location.search).get('app') === 'true';
    
    return isWv || isStandalone || isApkParam;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('phone');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('laptop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear pre-populated guest mock data when user is authenticated (creating an account or logging in)
  useEffect(() => {
    if (firebaseUser) {
      const hasDummyFolders = folders.some(f => f.id === "f1" || f.id === "f2" || f.id === "f3");
      const hasDummyQuizzes = quizzes.some(q => q.id === "q1" || q.id === "q2");
      const hasDummyAttempts = attempts.some(a => a.id === "att_1" || a.id === "att_2" || a.id === "att_3" || a.id === "att_4");

      if (hasDummyFolders) {
        setFolders([]);
        localStorage.setItem("mooderia_folders", JSON.stringify([]));
      }
      if (hasDummyQuizzes) {
        setQuizzes([]);
        localStorage.setItem("mooderia_quizzes", JSON.stringify([]));
      }
      if (hasDummyAttempts) {
        setAttempts([]);
        localStorage.setItem("mooderia_attempts", JSON.stringify([]));
      }
    }
  }, [firebaseUser, folders, quizzes, attempts]);

  // Save states modifications automatically 
  useEffect(() => {
    try {
      localStorage.setItem("mooderia_profile", JSON.stringify(profile));
    } catch (e) {
      console.error(e);
      alert("Storage Quota Exceeded for profile settings!");
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem("mooderia_folders", JSON.stringify(folders));
    } catch (error) {
      console.error("Local storage quota exceeded for folders", error);
      alert("Storage Quota Exceeded! Your academic data is too large to fully save locally. Please consider removing unused heavy assets (videos/large docs) to ensure your data saves successfully.");
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem("mooderia_quizzes", JSON.stringify(quizzes));
    } catch (e) {
      console.error(e);
    }
  }, [quizzes]);

  useEffect(() => {
    try {
      localStorage.setItem("mooderia_attempts", JSON.stringify(attempts));
    } catch (e) {
      console.error(e);
    }
  }, [attempts]);

  useEffect(() => {
    localStorage.setItem("mooderia_sound_on", soundOn ? "true" : "false");
    sound.enabled = soundOn;
  }, [soundOn]);

  const handleTabChange = (tab: typeof activeTab) => {
    sound.playPop();
    setActiveTab(tab);
  };

  const handleToggleSound = () => {
    const target = !soundOn;
    setSoundOn(target);
    if (target) {
      setTimeout(() => sound.playTick(), 80);
    }
  };

  const handleQuizAttemptFinished = (newAttempt: QuizAttempt) => {
    setAttempts(prev => [newAttempt, ...prev]);
  };

  const handleMaterialAdded = () => {
    // Optional refresh trigger callbacks
  };

  const handleCreateFolder = (name: string, description: string) => {
    setFolders(prev => [{
      id: Date.now().toString(),
      name,
      description,
      createdAt: new Date().toISOString(),
      materialsCount: 0,
      materials: []
    }, ...prev]);
  };

  // AI Assistant and copilot components deactivated as requested

  // Find css matches for current avatar backdrops
  const getCurrentGradientCss = () => {
    return `bg-gradient-to-br ${profile.avatarGradientStart || "from-indigo-600"} ${profile.avatarGradientEnd || "to-fuchsia-600"}`;
  };

  // MOBILE RESTRICTION
  if (isMobileOS && !isAppEnv) {
    return <MobileRestrictionView onInstall={handleInstallClick} />;
  }

  // DESKTOP LANDING
  if (!isMobileOS && !hasPassedDesktopLanding && !profile.signedIn) {
    return <DesktopLandingView onStartLearning={() => {
      localStorage.setItem("mooderia_desktop_landing_passed", "true");
      setPassedDesktopLanding(true);
    }} />;
  }

  // SPLASH SCREEN CORE RENDER
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#020512] flex flex-col items-center justify-center overflow-hidden z-[99999] select-none text-slate-100">
        {/* Glow ambient radial atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        
        {/* Fine background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#090d22_1px,transparent_1px),linear-gradient(to_bottom,#090d22_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative z-10 text-center space-y-8 max-w-sm px-6">
          {/* Pulsing Core Icon Logo with visual animations */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: [0.75, 1.08, 1], opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative w-20 h-20 mx-auto"
          >
            {/* Ambient neon blurring */}
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/20 flex items-center justify-center shadow-xl shadow-indigo-950/50 p-3">
              <Sparkles className="w-9 h-9 text-indigo-400 animate-pulse" />
            </div>
          </motion.div>

          {/* Typography headers */}
          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, letterSpacing: "0.1em", y: 4 }}
              animate={{ opacity: 1, letterSpacing: "0.22em", y: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-[0.22em] leading-none text-center"
            >
              Mooderia
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 1.2, ease: "easeInOut" }}
              className="h-[1px] w-32 bg-gradient-to-r from-transparent via-indigo-505/50 to-transparent mx-auto"
            />

            <motion.h2
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1.0 }}
              className="text-[11px] font-mono uppercase tracking-[0.4em] text-indigo-400 font-bold"
            >
              Education
            </motion.h2>
          </div>

          {/* Soft loading progress status bar */}
          <div className="space-y-2.5 pt-4">
            <div className="h-1 w-40 bg-slate-950 rounded-full mx-auto overflow-hidden border border-slate-900 relative">
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
              />
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.0 }}
              className="text-[9px] font-mono uppercase tracking-widest text-slate-500"
            >
              Booting educational protocols...
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY CHECKPOINTS
  const isUserAuthenticated = firebaseUser && firebaseUser.emailVerified;

  // Render sign in channels if no live verified user session exists
  if (!isUserAuthenticated) {
    return (
      <SignInView 
        onVerificationCheckSuccess={async () => {
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            setFirebaseUser(user);
            const exists = await checkUserDocExists(user.uid);
            if (exists) {
              const snap = await getDoc(doc(db, "users", user.uid));
              if (snap.exists()) {
                const data = snap.data();
                const avatarKey = `mooderia_custom_avatar_${user.uid}`;
                const savedAvatar = localStorage.getItem(avatarKey) || undefined;
                setProfile({
                  name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Student Scholar",
                  studentId: data.uid,
                  institution: data.university || "Academic Institution",
                  gradeLevel: data.year || "1st Year",
                  avatarEmoji: data.avatar_emoji || "🤖",
                  avatarGradientStart: "from-indigo-600",
                  avatarGradientEnd: "to-fuchsia-600",
                  avatarUrl: savedAvatar,
                  university: data.university || "Academic Institution",
                  program: data.program || "Academic Program",
                  year: data.year || "1st Year",
                  signedIn: true
                });
                setIsOnboardingActive(false);
              }
            } else {
              setIsOnboardingActive(true);
            }
          }
        }}
      />
    );
  }

  // Intercept and load recruiting and profile builder onboarding modal if Firestore records are missing
  if (isOnboardingActive && firebaseUser) {
    return (
      <OnboardingModal
        user={firebaseUser}
        onOnboardingComplete={(newProfile) => {
          setFolders([]);
          setQuizzes([]);
          setAttempts([]);
          setProfile(newProfile);
          setIsOnboardingActive(false);
          localStorage.setItem("mooderia_folders", JSON.stringify([]));
          localStorage.setItem("mooderia_quizzes", JSON.stringify([]));
          localStorage.setItem("mooderia_attempts", JSON.stringify([]));
        }}
      />
    );
  }

  // Loading barrier during active Firestore profile synchronization checks
  if (isUserAuthenticated && !profile.signedIn && !isOnboardingActive) {
    return (
      <div className="fixed inset-0 bg-[#020512] flex flex-col items-center justify-center overflow-hidden z-[99999] select-none text-slate-100">
        <div className="relative z-10 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Establishing Core Portfolio Ledger...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PATTERN 1: MOBILE PHONE DESIGN (Ultra-Compact OS Pocket-Style)
  // -------------------------------------------------------------
  if (deviceType === 'phone') {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-150 flex flex-col relative selection:bg-indigo-600/30 select-none pb-28 pt-24">
        {/* Phone minimal HUD tray bar */}
        <header className="fixed top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-900/60 px-4 pb-2 pt-[max(env(safe-area-inset-top),2.5rem)] flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-600 w-7 h-7 flex items-center justify-center overflow-hidden">
              <ShieldCheck className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="text-[10px] font-mono font-black tracking-[0.2em] text-white">M.EDUCATION</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Status Indicator */}
            <span className={`px-1.5 py-0.5 text-[8px] font-mono border rounded uppercase flex items-center gap-1 ${
              isOnline ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/40" : "bg-amber-950/80 text-amber-400 border-amber-900/40 animate-pulse"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{isOnline ? "Online" : "Offline"}</span>
            </span>
            {/* Quick indicators */}
            <span className="px-1.5 py-0.5 text-[8px] font-mono bg-indigo-950/80 text-indigo-400 border border-indigo-900/40 rounded uppercase">
              Pocket HUD
            </span>
            <button 
              onClick={handleToggleSound} 
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-white"
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <div 
              onClick={() => handleTabChange('profile')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-md shadow cursor-pointer overflow-hidden ${!profile.avatarUrl ? getCurrentGradientCss() : 'bg-slate-800'}`}
            >
              {profile.avatarUrl ? (
                 <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                 profile.avatarEmoji || "⚡"
              )}
            </div>
          </div>
        </header>

        {/* Main core content area */}
        <main className="flex-1 px-4 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'folders' && (
                <FoldersView 
                  folders={folders} 
                  setFolders={setFolders} 
                  onMaterialAdded={handleMaterialAdded} 
                  quizzes={quizzes}
                  setQuizzes={setQuizzes}
                  onNavigate={handleTabChange}
                />
              )}
              {activeTab === 'quizzes' && (
                <QuizzesView quizzes={quizzes} setQuizzes={setQuizzes} folders={folders} onQuizAttemptFinished={handleQuizAttemptFinished} />
              )}
              {activeTab === 'profile' && (
                <ProfileView profile={profile} setProfile={setProfile} folders={folders} quizzes={quizzes} totalAttempts={attempts.length} onLogout={() => auth.signOut()} />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsView attempts={attempts} folders={folders} quizzes={quizzes} />
              )}
              {activeTab === 'arena' && (
                <ArenaView quizzes={quizzes} profile={profile} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Phone floating device drawer base navigation */}
        <nav className="fixed bottom-4 left-4 right-4 bg-slate-950/95 backdrop-blur-xl border border-slate-900/80 p-1.5 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] z-30 flex justify-around items-center">
          {[
            { id: "folders", label: "Work", icon: FolderOpen },
            { id: "quizzes", label: "Recalls", icon: Brain },
            { id: "arena", label: "Arena", icon: Gamepad2 },
            { id: "analytics", label: "Stats", icon: BarChart2 },
            { id: "profile", label: "Id", icon: User }
          ].map(item => {
            const isSelected = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer ${
                  isSelected ? "bg-indigo-600/20 text-white font-bold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                <span className="text-[9px] uppercase tracking-widest font-mono">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PATTERN 2: TABLET DESIGN (Horizontal Layout with Side Icon Rail Dashboard)
  // -------------------------------------------------------------
  if (deviceType === 'tablet') {
    return (
      <div 
        className="min-h-screen bg-[#090d16] text-slate-100 flex flex-row relative selection:bg-indigo-600/30 selection:text-indigo-200 overflow-hidden"
        style={{
          background: "radial-gradient(circle at bottom left, rgba(79, 70, 229, 0.08), transparent 40%), #070a13"
        }}
      >
        {/* Left Side Icon Rail Navigation */}
        <aside className="w-20 bg-slate-950/80 border-r border-slate-900/80 flex flex-col justify-between items-center pb-6 pt-[max(env(safe-area-inset-top),1.5rem)] shrink-0 z-20 relative backdrop-blur-md">
          <div className="flex flex-col items-center gap-8">
            {/* Minimal brand icon */}
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md w-11 h-11 flex items-center justify-center overflow-hidden">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>

            {/* Vertical Rail Indicators */}
            <nav className="flex flex-col gap-4">
              {[
                { id: "folders", label: "Workspace", icon: FolderOpen },
                { id: "quizzes", label: "Recalls", icon: Brain },
                { id: "arena", label: "Arena", icon: Gamepad2 },
                { id: "analytics", label: "Analytics", icon: BarChart2 },
                { id: "profile", label: "Profile", icon: User }
              ].map(item => {
                const isSelected = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id as any)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center relative group transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-950" 
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                    title={item.label}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="activeTabletDot"
                        className="absolute left-1 w-1 h-6 bg-indigo-400 rounded-full"
                      />
                    )}
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom control hub for Tablet */}
          <div className="flex flex-col gap-4 items-center">
            {/* Form factor notification tag */}
            <div className="p-1 bg-slate-900 border border-slate-800 rounded-lg" title="Tablet Mode Secured">
              <Tablet className="w-4 h-4 text-indigo-400" />
            </div>

            <button 
              onClick={handleToggleSound} 
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div 
              onClick={() => handleTabChange('profile')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg cursor-pointer overflow-hidden ${!profile.avatarUrl ? getCurrentGradientCss() : 'bg-slate-800'}`}
            >
              {profile.avatarUrl ? (
                 <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                 profile.avatarEmoji || "⚡"
              )}
            </div>
          </div>
        </aside>

        {/* Workspace body window */}
        <section className="flex-1 min-w-0 flex flex-col justify-between overflow-y-auto h-screen p-6 pt-[max(env(safe-area-inset-top),1.5rem)] relative">
          
          {/* Breadcrumb style top bar header for Tablet */}
          <header className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
            <div>
              <span className="text-[9px] font-mono tracking-[0.25em] text-indigo-400 uppercase">
                MOODERIA ACADEMIA PARTNERSHIP
              </span>
              <h2 className="text-xl font-bold font-display text-white mt-0.5 uppercase tracking-tight">
                {activeTab === 'folders' ? "Workspace Cabinets" : activeTab === 'quizzes' ? "Active Recalls & Decks" : activeTab === 'arena' ? "Battle Quiz Arena" : activeTab === 'profile' ? "Account Identity" : "Data Diagnostics"}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 text-xs font-mono border rounded-xl flex items-center gap-2 ${
                isOnline ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/30" : "bg-amber-950/50 text-amber-400 border-amber-900/30 animate-pulse"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="font-bold text-[10px] tracking-wider uppercase">{isOnline ? "Online Status" : "Offline Local"}</span>
              </div>
              <div className="text-right text-xs bg-slate-950 px-3 py-1.5 border border-slate-900 rounded-xl">
                <span className="text-slate-500 font-mono">USER / </span>
                <span className="text-indigo-400 font-bold uppercase tracking-tight">{profile.name}</span>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {activeTab === 'folders' && (
                  <FoldersView 
                    folders={folders} 
                    setFolders={setFolders} 
                    onMaterialAdded={handleMaterialAdded} 
                    quizzes={quizzes}
                    setQuizzes={setQuizzes}
                    onNavigate={handleTabChange}
                  />
                )}
                {activeTab === 'quizzes' && (
                  <QuizzesView quizzes={quizzes} setQuizzes={setQuizzes} folders={folders} onQuizAttemptFinished={handleQuizAttemptFinished} />
                )}
                {activeTab === 'profile' && (
                  <ProfileView profile={profile} setProfile={setProfile} folders={folders} quizzes={quizzes} totalAttempts={attempts.length} onLogout={() => auth.signOut()} />
                )}
                {activeTab === 'analytics' && (
                  <AnalyticsView attempts={attempts} folders={folders} quizzes={quizzes} />
                )}
                {activeTab === 'arena' && (
                  <ArenaView quizzes={quizzes} profile={profile} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer for tablet space */}
          <footer className="mt-8 pt-4 border-t border-slate-900/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <p>TABLET VIEW • LOCAL STUDY WORKSPACE</p>
            <span className="text-indigo-400">MOODERIA EDUCATION</span>
          </footer>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PATTERN 3: LAPTOP/DESKTOP DESIGN (Majestic 7D Heavy Bold layout format)
  // -------------------------------------------------------------
  return (
    <div 
      className="min-h-screen bg-slate-[#020617] text-slate-100 flex flex-col relative selection:bg-indigo-600/30 selection:text-indigo-200 p-8 sm:p-12 overflow-x-hidden"
      style={{
        background: "radial-gradient(circle at top right, rgba(79, 70, 229, 0.16), transparent 45%), radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.10), transparent 45%), #020617"
      }}
    >
      {/* LAPTOP FORM FACTOR HUD TRAY INDICATOR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        <div className="px-3 py-1 bg-indigo-950/40 border border-indigo-900/20 text-indigo-400 font-mono text-[9px] uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-md">
          <Laptop className="w-3.5 h-3.5" />
          <span>LAPTOP WORKSPACE MODE ACTIVE</span>
        </div>
        <div className={`px-3 py-1 border font-mono text-[9px] uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-md ${
          isOnline ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/30" : "bg-amber-950/60 text-amber-400 border-amber-900/30"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          <span>{isOnline ? "Online Sync Active" : "Local Offline Core"}</span>
        </div>
      </div>

      {/* HEADER CONTROLS (Laptop/Desktop Heavy weight) */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 border-b border-slate-800 pb-8 gap-6 relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-[0.3em] text-indigo-400 uppercase mb-1 font-semibold">
            Academic System v4.02
          </span>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none text-white select-none relative">
            MOODERIA <span className="text-indigo-500 font-extrabold">EDUCATION</span>
            <span className="absolute -bottom-1 left-0 w-24 h-[4px] bg-gradient-to-r from-indigo-500 to-purple-500" />
          </h1>
        </div>

        {/* PROFILE INTEGRATION DECAL (Laptop Large design) */}
        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all shadow-2xl w-full lg:w-96 group relative overflow-hidden">
          {/* Subtle decoration inside decal */}
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-right flex-1 select-none">
            <p className="text-xs font-mono font-bold text-indigo-400 tracking-wider">ACTIVE SCHOLAR</p>
            <p className="text-sm font-black text-white uppercase tracking-tight mt-0.5">{profile.name}</p>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{profile.studentId}</p>
          </div>
          <div 
            onClick={() => handleTabChange('profile')}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(99,102,241,0.30)] hover:scale-105 active:scale-95 transition-all cursor-pointer select-none border border-white/10 overflow-hidden ${!profile.avatarUrl ? getCurrentGradientCss() : 'bg-slate-800'}`}
            title="Update biometric badge credentials"
          >
            {profile.avatarUrl ? (
               <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
               profile.avatarEmoji || "⚡"
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT PORTAL CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto pb-44 relative z-15">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -3 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-full"
          >
            {activeTab === 'folders' && (
              <FoldersView 
                folders={folders} 
                setFolders={setFolders} 
                onMaterialAdded={handleMaterialAdded} 
                quizzes={quizzes}
                setQuizzes={setQuizzes}
                onNavigate={handleTabChange}
              />
            )}
            
            {activeTab === 'quizzes' && (
              <QuizzesView 
                quizzes={quizzes} 
                setQuizzes={setQuizzes} 
                folders={folders}
                onQuizAttemptFinished={handleQuizAttemptFinished}
              />
            )}
            
            {activeTab === 'profile' && (
              <ProfileView 
                profile={profile} 
                setProfile={setProfile} 
                folders={folders} 
                quizzes={quizzes}
                totalAttempts={attempts.length}
                onLogout={() => auth.signOut()}
              />
            )}
            
            {activeTab === 'analytics' && (
              <AnalyticsView 
                attempts={attempts} 
                folders={folders} 
                quizzes={quizzes} 
              />
            )}

            {activeTab === 'arena' && (
              <ArenaView 
                quizzes={quizzes} 
                profile={profile} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FLOATING PILL NAVIGATION (Widescreen laptop design) */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-2xl border border-slate-850 p-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30 select-none">
        {[
          { id: "folders", label: "Workspace" },
          { id: "quizzes", label: "Recalls" },
          { id: "arena", label: "Arena" },
          { id: "analytics", label: "Analytics" },
          { id: "profile", label: "Profile" }
        ].map(item => {
          const isSelected = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={`px-7 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                isSelected 
                  ? "bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.5)] border-t border-white/20" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        <div className="w-[1px] h-5 bg-slate-800 mx-2"></div>

        {/* SOUND CONTROLLER WITH ACTIVE SPINNING SYSTEM */}
        <button
          onClick={handleToggleSound}
          className="w-11 h-11 flex items-center justify-center bg-slate-800/40 hover:bg-slate-700 border border-slate-700/30 rounded-full text-md transition-all cursor-pointer text-slate-400 hover:text-white"
          title={soundOn ? "Mute Acoustics Synth" : "Enable Acoustics Synth"}
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </nav>

      {/* FOOTER CONTROLS DESKTOP */}
      <footer className="w-full max-w-7xl mx-auto border-t border-slate-900 pt-8 mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] font-mono text-slate-500 relative z-10 bottom-0 pb-8 uppercase">
        <p>© 2026 MOODERIA EDUC. LOCALSTORAGE METRICS SECURITY CABINET.</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 px-3 py-1 rounded-full text-slate-400 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="font-bold">LOCAL FIRST STORAGE</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 border rounded-full text-[9px] ${
            isOnline ? "bg-emerald-950/40 text-emerald-400 border-emerald-850" : "bg-amber-950/40 text-amber-450 border-amber-850"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"} ${!isOnline && "animate-pulse"}`} />
            <span className="font-bold">{isOnline ? "ONLINE CONNECTIONS WORK" : "OFFLINE WORKSPACE SECURED"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

