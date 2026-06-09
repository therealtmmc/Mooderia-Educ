import React, { useState, useRef } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { initializeStudentProfileInDb } from "../firebase/authService";
import { sound } from "../utils/sound";
import { 
  Sparkles, 
  Upload, 
  ArrowRight, 
  Check, 
  Trash2, 
  School, 
  BookOpen, 
  Terminal,
  ShieldCheck
} from "lucide-react";
import { motion } from "motion/react";

interface OnboardingModalProps {
  user: FirebaseUser;
  onOnboardingComplete: (profile: any) => void;
}

export default function OnboardingModal({ user, onOnboardingComplete }: OnboardingModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [university, setUniversity] = useState("");
  const [year, setYear] = useState("1st Year");
  const [theme, setTheme] = useState("Classic Mooderia Purple");
  const [avatarEmoji, setAvatarEmoji] = useState("🤖");
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CARTOON_EMOJIS = ["🦁", "🦊", "🐼", "🐨", "🦉", "🦄", "🐙", "🦖", "🛸", "🤖", "🧠", "💻"];
  const THEMES = [
    "Classic Mooderia Purple",
    "Midnight Violet",
    "Mint Green",
    "Electric Yellow"
  ];

  const handleAvatarSelect = (emoji: string) => {
    sound.playTick();
    setAvatarEmoji(emoji);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorText("File size too heavy! Please select a picture under 2MB to ensure clean client local storage performance.");
      sound.playPop();
      return;
    }

    sound.playTick();
    setErrorText("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string | undefined;
      if (base64) {
        setCustomAvatarBase64(base64);
        sound.playChime();
      }
    };
    reader.onerror = () => {
      setErrorText("Error decoding image stream.");
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomAvatar = () => {
    sound.playTick();
    setCustomAvatarBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !university.trim()) {
      setErrorText("Please fill out your metadata completely.");
      sound.playPop();
      return;
    }

    setIsLoading(true);
    setErrorText("");
    sound.playChime();

    try {
      // 1. Handshake the data writes with Firestore (excludes base64 to keep firestore space 100% free)
      await initializeStudentProfileInDb(user, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        university: university.trim(),
        year,
        theme,
        avatar_emoji: avatarEmoji
      });

      // 2. Persist the optional Base64 picture locally on the client machine to conserve space
      const localAvatarKey = `mooderia_custom_avatar_${user.uid}`;
      if (customAvatarBase64) {
        localStorage.setItem(localAvatarKey, customAvatarBase64);
      } else {
        localStorage.removeItem(localAvatarKey);
      }

      // 3. Keep a track of client theme preferences locally as well
      localStorage.setItem(`mooderia_theme_selection_${user.uid}`, theme);

      // Create profile representation matching StudentIdentity
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const mockResultProfile = {
        name: fullName,
        studentId: user.uid,
        institution: university.trim(),
        gradeLevel: year,
        avatarEmoji: avatarEmoji,
        avatarGradientStart: "from-indigo-600",
        avatarGradientEnd: "to-fuchsia-600",
        university: university.trim(),
        program: `${year} Track`,
        year: year,
        theme: theme,
        signedIn: true
      };

      onOnboardingComplete(mockResultProfile);
    } catch (err: any) {
      console.error("[Profile Handshake Error] Write violated rules:", err);
      setErrorText(err.message || "Failed initializing cloud metadata ledger document.");
      sound.playPop();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative text-left"
      >
        {/* Glowing visual accent strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Recruiter Header */}
          <div className="text-center space-y-2 border-b border-slate-850 pb-5">
            <div className="animate-spin duration-3000 inline-flex p-2.5 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-purple-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white uppercase tracking-tight">
              Recruiting &amp; Profile Builder
            </h2>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest leading-loose">
              Establish Verified Student Coordinates
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Marie"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Curie"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* University Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">University Name / College</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <School className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. University of Oxford"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Grid for Dropdown Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Year Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Year of University</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="1st Year">1st Year (Freshman)</option>
                  <option value="2nd Year">2nd Year (Sophomore)</option>
                  <option value="3rd Year">3rd Year (Junior)</option>
                  <option value="4th Year">4th Year (Senior)</option>
                  <option value="Post-Grad">Post-Graduate (Master/PhD)</option>
                </select>
              </div>

              {/* Theme Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Base App Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Default Avatar Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Default Avatar Emoji selection</label>
                <span className="text-lg bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{avatarEmoji}</span>
              </div>
              <div className="flex flex-wrap gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
                {CARTOON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAvatarSelect(emoji)}
                    className={`w-9 h-9 text-base flex items-center justify-center rounded-xl transition-all ${
                      avatarEmoji === emoji && !customAvatarBase64
                        ? "bg-purple-600 text-white scale-110 shadow-lg shadow-purple-900"
                        : "bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Avatar Picture with File Upload */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                    Custom Avatar Picture (Client-Only Storage)
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Uploaded image is saved locally as Base64 to bypass server storage limits and keep database free!
                  </p>
                </div>
                {customAvatarBase64 && (
                  <button
                    type="button"
                    onClick={handleClearCustomAvatar}
                    className="p-1.5 text-rose-450 hover:bg-rose-950/40 rounded transition-colors"
                    title="Remove custom avatar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Visual Avatar frame indicator */}
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center relative">
                  {customAvatarBase64 ? (
                    <img 
                      src={customAvatarBase64} 
                      alt="Custom preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{avatarEmoji}</span>
                  )}
                  {customAvatarBase64 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                    id="avatar-file-upload-input"
                  />
                  <label
                    htmlFor="avatar-file-upload-input"
                    className="flex justify-center items-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer hover:text-white transition-colors uppercase font-mono tracking-wider w-fit"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Upload snapshot</span>
                  </label>
                </div>
              </div>
            </div>

            {errorText && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/30 rounded-xl text-xs text-rose-400 text-left font-sans">
                {errorText}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-display text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Synchronizing Handshake...</span>
                  </span>
                ) : (
                  <>
                    <span>Enter Mooderia Education</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
