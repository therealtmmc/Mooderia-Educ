import React, { useState } from "react";
import { StudentIdentity } from "../types";
import { sound } from "../utils/sound";
import { ShieldCheck, User, School, BookOpen, GraduationCap, ArrowRight, Laptop, Sparkles } from "lucide-react";

interface SignInViewProps {
  onSignInComplete: (newProfile: StudentIdentity) => void;
}

export default function SignInView({ onSignInComplete }: SignInViewProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("1st Year");
  const [university, setUniversity] = useState("");
  const [program, setProgram] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🧠");
  const [gradientIndex, setGradientIndex] = useState(0);

  const EMOJIS = ["🧠", "🎓", "🔬", "💻", "🎨", "📚", "📐", "🚀", "🧬", "🌍"];
  const GRADIENTS = [
    { start: "from-indigo-600", end: "to-fuchsia-600", bg: "bg-gradient-to-br from-indigo-600 to-fuchsia-600" },
    { start: "from-teal-600", end: "to-emerald-600", bg: "bg-gradient-to-br from-teal-600 to-emerald-600" },
    { start: "from-rose-600", end: "to-orange-500", bg: "bg-gradient-to-br from-rose-600 to-orange-500" },
    { start: "from-cyan-500", end: "to-blue-600", bg: "bg-gradient-to-br from-cyan-500 to-blue-600" },
    { start: "from-yellow-500", end: "to-amber-500", bg: "bg-gradient-to-br from-yellow-500 to-amber-500" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !university.trim() || !program.trim()) {
      return;
    }

    sound.playChime();

    const newProfile: StudentIdentity = {
      name: name.trim(),
      studentId: `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      institution: university.trim(),
      gradeLevel: year,
      avatarEmoji,
      avatarGradientStart: GRADIENTS[gradientIndex].start,
      avatarGradientEnd: GRADIENTS[gradientIndex].end,
      university: university.trim(),
      program: program.trim(),
      year: year,
      signedIn: true
    };

    onSignInComplete(newProfile);
  };

  const handleSelectEmoji = (emoji: string) => {
    sound.playTick();
    setAvatarEmoji(emoji);
  };

  const handleSelectGradient = (index: number) => {
    sound.playTick();
    setGradientIndex(index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative selection:bg-indigo-600/30">
      {/* Absolute geometric noise backdrops */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-lg relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-8 hover:border-slate-750 transition-colors">
        {/* Glowing Top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            MOODERIA<span className="text-indigo-500">.</span>EDUC
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Academic Portfolio &amp; Recall Engine
          </p>
        </div>

        {/* Introduction Note */}
        <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-white uppercase font-mono">🔑 SECURE CLIENT SIGN-IN</p>
          <p>Please authorize this workstation of Mooderia Educ, verifying your profile coordinates. All configurations persist offline in your personal web dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name input */}
          <div className="space-y-1.5ClassName bg-slate-900">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Your Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Academic university / School */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">University / Alma Mater</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <School className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={university}
                onChange={e => setUniversity(e.target.value)}
                placeholder="e.g. Stanford University"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Degree program */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Name of Program / Major</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <BookOpen className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={program}
                onChange={e => setProgram(e.target.value)}
                placeholder="e.g. BS Computer Science"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Year of study dropdown selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Year of Study</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="1st Year">1st Year (Freshman)</option>
              <option value="2nd Year">2nd Year (Sophomore)</option>
              <option value="3rd Year">3rd Year (Junior)</option>
              <option value="4th Year">4th Year (Senior)</option>
              <option value="Postgraduate">Postgraduate Standard</option>
            </select>
          </div>

          {/* AVATAR EMBED FOR UNIQUE ID */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Select Badge Avatar</span>
              <span className="text-xl">{avatarEmoji}</span>
            </div>
            <div className="flex flex-wrap gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
              {EMOJIS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectEmoji(item)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
                    avatarEmoji === item ? "bg-indigo-600 text-white scale-110" : "bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* ACCENT BACKGROUND GRADIENT CARD */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Select linear brand theme</span>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENTS.map((grad, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectGradient(idx)}
                  className={`h-7 rounded-lg border border-white/5 transition-all flex items-center justify-center ${grad.bg} ${
                    gradientIndex === idx ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900" : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* SIGN IN RUN DRILL TOGGLE */}
          <button
            type="submit"
            className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Register &amp; Open Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
