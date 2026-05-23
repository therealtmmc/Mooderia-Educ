import React from 'react';
import { motion } from 'motion/react';
import { Download, FolderOpen, Mic, Brain, Sparkles, ShieldCheck } from 'lucide-react';

export default function DesktopRestrictionView() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-8 text-slate-900 font-sans select-none">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Brand and Download */}
        <div className="space-y-10">
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-20 h-20 rounded-3xl bg-violet-600 flex items-center justify-center shadow-2xl shadow-violet-600/30 overflow-hidden p-4"
            >
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter invert" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <ShieldCheck className="w-10 h-10 text-white hidden" />
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.05]"
            >
              Mooderia <span className="text-violet-600">Education</span>
              <br/>
              <span className="text-3xl lg:text-4xl text-slate-400 font-bold tracking-normal leading-[1.2] block mt-2">is Mobile Exclusive.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="text-xl text-slate-600 max-w-lg leading-relaxed font-medium"
            >
              To provide the most immersive and focused learning environment, Mooderia Education is exclusively designed for phones and tablets.
            </motion.p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="space-y-4"
          >
            <a 
              href="https://drive.google.com/file/d/1K5KtJJxPJn7mO84u4HsmNqC0eOUcyrde/view?usp=drivesdk" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-1"
            >
              <Download className="w-6 h-6" />
              Download APK for Android
            </a>
            <p className="text-sm font-mono text-slate-400 font-semibold tracking-widest uppercase pl-1">Requires Android 8.0 or higher</p>
          </motion.div>
        </div>

        {/* Right Side: Features Bento */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="grid gap-5"
        >
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex gap-6 items-start hover:shadow-md transition-shadow">
            <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl shrink-0">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Academic Organizer</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Structure your coursework flawlessly with premium folder hierarchies and seamless resource management directly on your mobile device.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl w-fit">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Lecture Capture</h3>
                <p className="text-sm text-slate-500 font-medium">Record and review voice memos directly inside your subjects.</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl w-fit">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Recall</h3>
                <p className="text-sm text-slate-500 font-medium">Interactive spaced-repetition quizzes optimize your memory.</p>
              </div>
            </div>
          </div>

          <div className="bg-violet-600 text-white p-8 rounded-3xl shadow-xl shadow-violet-600/20 flex gap-6 items-center hover:shadow-2xl hover:shadow-violet-600/30 transition-shadow">
            <div className="p-4 bg-white/20 text-white rounded-2xl shrink-0 backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">AI Flashcard Generator</h3>
              <p className="text-violet-100 font-medium">Automatically build study decks from your notes. Let AI test your knowledge in real-time.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
