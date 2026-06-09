import React, { useState } from "react";
import { StudentIdentity, FolderCabinet, QuizDeck } from "../types";
import { sound } from "../utils/sound";
import { ShieldCheck, User, School, Hash, Landmark, Sparkles, Check, Edit2, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfileViewProps {
  profile: StudentIdentity;
  setProfile: React.Dispatch<React.SetStateAction<StudentIdentity>>;
  folders: FolderCabinet[];
  quizzes: QuizDeck[];
  totalAttempts: number;
  onLogout?: () => void;
}

const EMOJI_PRESETS = ["🎓", "🧪", "🔬", "🧬", "🚀", "💻", "🧠", "📚", "🎨", "📐", "🌍", "🪐"];

const GRADIENT_PRESETS = [
  { id: "purple", label: "Hyper Violet", start: "from-indigo-600", end: "to-fuchsia-600", css: "bg-gradient-to-br from-indigo-600 to-fuchsia-600" },
  { id: "emerald", label: "Deep Emerald", start: "from-teal-600", end: "to-emerald-600", css: "bg-gradient-to-br from-teal-600 to-emerald-600" },
  { id: "sunset", label: "Cosmic Sunset", start: "from-rose-600", end: "to-orange-500", css: "bg-gradient-to-br from-rose-600 to-orange-500" },
  { id: "sky", label: "Cyber Sky", start: "from-cyan-500", end: "to-blue-600", css: "bg-gradient-to-br from-cyan-500 to-blue-600" },
  { id: "solar", label: "Solar Flare", start: "from-yellow-500", end: "to-amber-500", css: "bg-gradient-to-br from-yellow-500 to-amber-500" }
];

export default function ProfileView({ profile, setProfile, folders, quizzes, totalAttempts, onLogout }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [tempName, setTempName] = useState(profile.name);
  const [tempStudentId, setTempStudentId] = useState(profile.studentId);
  const [tempInstitution, setTempInstitution] = useState(profile.institution);
  const [tempGrade, setTempGrade] = useState(profile.gradeLevel);
  const [tempProgram, setTempProgram] = useState(profile.program || "");

  // Stats calculators
  const totalFolders = folders.length;
  const totalMaterials = folders.reduce((sum, f) => sum + f.materials.length, 0);
  const totalCardsCount = quizzes.reduce((sum, q) => sum + q.cards.length, 0);

  const handlePop = () => sound.playPop();
  const handleTick = () => sound.playTick();
  const handleChime = () => sound.playChime();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    handleChime();
    setProfile(prev => ({
      ...prev,
      name: tempName || prev.name,
      studentId: tempStudentId || prev.studentId,
      institution: tempInstitution || prev.institution,
      gradeLevel: tempGrade || prev.gradeLevel,
      university: tempInstitution || prev.institution,
      program: tempProgram || prev.program,
      year: tempGrade || prev.year
    }));
    setIsEditing(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    handleTick();
    setProfile(prev => ({ ...prev, avatarEmoji: emoji }));
  };

  const handleSelectGradient = (start: string, end: string) => {
    handleTick();
    setProfile(prev => ({ ...prev, avatarGradientStart: start, avatarGradientEnd: end }));
  };

  // Find css matches for current avatar backdrops
  const getCurrentGradientCss = () => {
    const matched = GRADIENT_PRESETS.find(g => g.start === profile.avatarGradientStart && g.end === profile.avatarGradientEnd);
    return matched ? matched.css : "bg-gradient-to-br from-indigo-600 to-fuchsia-600";
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 text-xs uppercase font-mono tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded">Security Console</span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white uppercase sm:text-4xl">
            Identity Badges
          </h1>
          <p className="text-sm text-slate-400 font-sans">
            Personalize your academic credentials, customize avatars, and review biometric lifetime summary progress metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: VISUAL STUDENT ID CARD */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">Active Digital Credential</span>
          
          <motion.div
            layoutId="profileCard"
            className="w-full relative rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl overflow-hidden min-h-[340px] flex flex-col justify-between hover:border-indigo-500/40 transition-colors"
          >
            {/* Ambient cyber mesh patterns */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-indigo-400" />
            </div>

            {/* Glowing boundary tag */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-violet-500 to-indigo-500" />

            {/* Cabinet Top Credentials logo */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">Mooderia Educ</span>
              </div>
              <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 border border-indigo-900/30 rounded font-semibold uppercase tracking-wider">
                Verifiable ID
              </span>
            </div>

            {/* ID CARD MAIN BLOCK */}
            <div className="py-6 flex flex-col sm:flex-row items-center gap-5 relative z-10">
              {/* LARGE CUSTOM AVATAR BLOCK */}
              <motion.div
                whileHover={{ rotate: 3, scale: 1.05 }}
                className={`w-24 h-24 rounded-2xl shrink-0 flex items-center justify-center text-5xl shadow-lg border-2 border-slate-900/80 cursor-pointer ${getCurrentGradientCss()}`}
              >
                <span>{profile.avatarEmoji}</span>
              </motion.div>

              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-xl font-display font-black tracking-tight text-white line-clamp-1">
                  {profile.name}
                </h3>
                
                <div className="space-y-0.5 text-[11px] font-mono text-slate-450">
                  <p className="flex items-center justify-center sm:justify-start gap-1">
                    <School className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[200px]" title={profile.university || profile.institution}>{profile.university || profile.institution}</span>
                  </p>
                  <p className="flex items-center justify-center sm:justify-start gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[200px] text-fuchsia-400 font-semibold">{profile.program || "Academic Program"}</span>
                  </p>
                  <p className="flex items-center justify-center sm:justify-start gap-1">
                    <span>Year: </span>
                    <span className="text-indigo-400 text-[10px] uppercase font-bold">{profile.year || profile.gradeLevel}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ID CARD BIOMETRICS FOOTER */}
            <div className="border-t border-slate-850 pt-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <div className="space-y-0.5">
                <span>INDEXED CABINETS</span>
                <span className="text-white block font-bold text-xs">{totalFolders} Fld</span>
              </div>
              <div className="space-y-0.5 text-center">
                <span>STUDY DRILLS</span>
                <span className="text-white block font-bold text-xs">{totalAttempts} runs</span>
              </div>
              <div className="space-y-0.5 text-right">
                <span>RECALL ACCRUAL</span>
                <span className="text-fuchsia-400 block font-bold text-xs">{totalCardsCount} cards</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: IDENTITY CUSTOMIZATION CONSOLE */}
        <div className="lg:col-span-7 space-y-6">
          {/* PROFILE EDITING CARD OR AVATAR CREATOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 relative overflow-hidden hover:border-indigo-500/30 transition-colors">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-violet-400" />
              <span>Identity Customizer Deck</span>
            </h3>

            {/* EDIT STATE TOGGLER */}
            <AnimatePresence mode="wait">
              {!isEditing ? (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Scholar Full Name</span>
                      <strong className="text-sm text-white font-display font-medium block">{profile.name}</strong>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Academic Program</span>
                      <strong className="text-sm text-fuchsia-400 font-display block uppercase">{profile.program || "N/A"}</strong>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Name of University</span>
                      <strong className="text-sm text-white font-display block">{profile.university || profile.institution}</strong>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Year of Study</span>
                      <strong className="text-sm text-indigo-400 font-mono block uppercase">{profile.year || profile.gradeLevel}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => { handlePop(); setIsEditing(true); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Re-author Credentials</span>
                    </button>

                    <button
                      onClick={() => {
                        handleTick();
                        setConfirmAction({
                          message: "Are you sure you want to clear this account and start completely fresh? All current folders, quizzes, and score history will be deleted.",
                          onConfirm: () => {
                            localStorage.clear();
                            setConfirmAction(null);
                            if (onLogout) {
                              onLogout();
                            } else {
                              setProfile(prev => ({ ...prev, signedIn: false }));
                            }
                          }
                        });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 hover:text-rose-400 rounded-xl text-xs font-mono font-semibold cursor-pointer"
                    >
                      <span>Wipe Station &amp; Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="edit"
                  onSubmit={handleSaveProfile}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">Scholar Name</label>
                      <input
                        type="text"
                        required
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">Name of Program / Major</label>
                      <input
                        type="text"
                        required
                        value={tempProgram}
                        onChange={e => setTempProgram(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">Name of University</label>
                      <input
                        type="text"
                        required
                        value={tempInstitution}
                        onChange={e => setTempInstitution(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase">Year of Study</label>
                      <input
                        type="text"
                        required
                        value={tempGrade}
                        onChange={e => setTempGrade(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { handleTick(); setIsEditing(false); }}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 rounded-xl border border-slate-800 cursor-pointer"
                    >
                      Dismiss Changes
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl border-t border-indigo-400/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Archive Identity</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="border-t border-slate-850/50 pt-5 space-y-4">
              {/* EMOJI CREATOR SELECTOR */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase block">Digital Identity Avatar Preset</span>
                <div className="flex flex-wrap gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850/50">
                  {EMOJI_PRESETS.map(emoji => {
                    const isSelected = profile.avatarEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                          isSelected 
                            ? "bg-indigo-600 text-white scale-110 shadow-md shadow-indigo-950" 
                            : "bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BACKDROP GRADIENTS */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase block">Linear Gradient Backdrop Theme</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {GRADIENT_PRESETS.map(grad => {
                    const isSelected = profile.avatarGradientStart === grad.start && profile.avatarGradientEnd === grad.end;
                    return (
                      <button
                        key={grad.id}
                        type="button"
                        onClick={() => handleSelectGradient(grad.start, grad.end)}
                        className={`py-2 px-3 rounded-lg text-[10px] font-bold font-mono text-white text-center transition-all cursor-pointer shadow border border-white/5 flex items-center justify-center gap-1 truncate ${grad.css}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white fill-emerald-500 border border-emerald-500 rounded-full shrink-0" />}
                        <span>{grad.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
