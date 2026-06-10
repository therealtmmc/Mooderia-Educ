import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, FolderOpen, Layers, Brain, PieChart, ShieldCheck, X, Sparkles } from 'lucide-react';

export default function MobileRestrictionView({ onInstall }: { onInstall: () => void }) {
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'creator' | null>(null);

  const renderModalContent = () => {
    switch (activeModal) {
      case 'terms':
        return {
          title: "END USER LICENSE AGREEMENT",
          content: "Effective Date: May 2026\n\nWelcome to Mooderia Education. By downloading, accessing, or using this application, you agree to be bound by these Terms and Conditions. Please review them carefully before accessing the academic workspace.\n\n1. LICENSE GRANT\nTravis Miguel Cepe grants you a personal, non-exclusive, non-transferable, and revocable license to use the Mooderia Education application strictly in accordance with these terms. You may not modify, attempt to extract source code, reverse engineer, or create derivative works.\n\n2. ACADEMIC INTEGRITY & LIABILITY\nThis platform is provided \"as is\" to facilitate personal study and organization. The software creator holds no liability for data loss, academic performance outturns, or any indirect damages resulting from the use of this service.\n\n3. INTELLECTUAL PROPERTY\nAll branding, database schema, logic flows, and interface designs are the intellectual property of Travis Miguel Cepe."
        };
      case 'privacy':
        return {
          title: "PRIVACY & DATA POLICY",
          content: "Effective Date: May 2026\n\nMooderia Education operates under a strict \"Privacy-First, Local-First\" paradigm. \n\n1. DATA COLLECTION & STORAGE\nWe do not operate remote servers to collect your personal information. All your academic data, including profiles, flashcards, folders, and statistics, is persisted exclusively in your device's local storage environments (e.g., LocalStorage or IndexedDB) ensuring total privacy.\n\n2. OFFLINE CAPABILITIES\nThe application is designed as a secure, offline-capable Progressive Web Application (PWA) / APK. Once initialized, the app requires zero network telemetry to operate out of the box.\n\n3. NO THIRD-PARTY TRACKING\nWe do not embed third-party analytics trackers, advertising modules, or any background data harvesting services."
        };
      case 'creator':
        return {
          title: "About the Creator",
          content: "Hello! I'm Travis Miguel Cepe.\n\nI am currently a 1st-year student pursuing a Bachelor of Science in Computer Engineering at MAPÚA UNIVERSITY. \n\nI built Mooderia Education to provide a seamless, highly organized, and immersive learning environment tailored for mobile devices. My passion lies in software development, creating applications that solve real-world problems and enhance academic productivity.\n\nI hope this application helps you in your academic journey!"
        };
      default:
        return null;
    }
  };

  const modalData = renderModalContent();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-between p-8 text-slate-900 font-sans select-none relative overflow-x-hidden">
      <div className="flex-1 flex items-center justify-center w-full max-w-6xl">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Brand and Download */}
        <div className="space-y-10">
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-20 h-20 rounded-3xl bg-violet-600 flex items-center justify-center shadow-2xl shadow-violet-600/30 overflow-hidden p-4"
            >
              <ShieldCheck className="w-10 h-10 text-white" />
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.05]"
            >
              Mooderia <span className="text-violet-600">Education</span>
              <br/>
              <span className="text-3xl lg:text-4xl text-slate-400 font-bold tracking-normal leading-[1.2] block mt-2">Get the Android App.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="text-xl text-slate-600 max-w-lg leading-relaxed font-medium"
            >
              For the best immersive and focused learning environment on mobile devices, please download our dedicated Android application.
            </motion.p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="space-y-4"
          >
            <button 
              onClick={onInstall}
              className="inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-1"
            >
              <Download className="w-6 h-6" />
              Install App
            </button>
            <div className="flex flex-col gap-1 pl-1">
              <p className="text-sm font-mono text-slate-500 font-semibold tracking-widest uppercase">Requires Android 8.0 or higher</p>
              <p className="text-sm font-mono text-violet-500 font-semibold tracking-widest uppercase">✨ Fully Offline Capable</p>
            </div>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Subject Organization</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Structure your coursework flawlessly with custom folder hierarchies and seamless resource management directly on your mobile device.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl w-fit">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Flashcards &amp; Notes</h3>
                <p className="text-sm text-slate-500 font-medium">Create rich text documents and custom study decks on the go.</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl w-fit">
                <PieChart className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Performance Analytics</h3>
                <p className="text-sm text-slate-500 font-medium">Track your study time and retention statistics locally.</p>
              </div>
            </div>
          </div>

          <div className="bg-violet-600 text-white p-8 rounded-3xl shadow-xl shadow-violet-600/20 flex gap-6 items-center hover:shadow-2xl hover:shadow-violet-600/30 transition-shadow">
            <div className="p-4 bg-white/20 text-white rounded-2xl shrink-0 backdrop-blur-sm">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Academic Recall Engine</h3>
              <p className="text-violet-100 font-medium">Maximize retention through interactive study sessions across all your local workspaces.</p>
            </div>
          </div>
        </motion.div>
        {/* End of grid */}
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-12 flex flex-col items-center justify-center gap-6 w-full max-w-6xl border-t border-slate-200/60 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-semibold text-slate-400">
          <button onClick={() => setActiveModal('terms')} className="hover:text-violet-600 transition-colors">Terms &amp; Conditions</button>
          <button onClick={() => setActiveModal('privacy')} className="hover:text-violet-600 transition-colors">Privacy Policy</button>
          <button onClick={() => setActiveModal('creator')} className="hover:text-violet-600 transition-colors cursor-pointer flex-shrink-0">
            About the Creator
          </button>
        </div>
        <div className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5 opacity-80">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span>Created with <span className="text-slate-600 font-bold bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">Google AI</span></span>
        </div>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {activeModal && modalData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">{modalData.title}</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0 outline-none">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="text-slate-600 space-y-4 leading-relaxed whitespace-pre-wrap font-medium">
                {modalData.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
