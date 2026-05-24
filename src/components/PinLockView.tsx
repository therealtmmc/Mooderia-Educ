import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Unlock, ShieldCheck } from "lucide-react";
import { sound } from "../utils/sound";

interface PinLockViewProps {
  isSetupMode: boolean;
  onSuccess: (pin?: string) => void;
  expectedPin?: string;
  studentName?: string;
}

export default function PinLockView({ isSetupMode, onSuccess, expectedPin, studentName }: PinLockViewProps) {
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [step, setStep] = useState<"enter" | "confirm">(isSetupMode ? "enter" : "enter");
  const [error, setError] = useState(false);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pin.length === 6) {
      if (isSetupMode) {
        if (step === "enter") {
          setTimeout(() => {
            setStep("confirm");
            setConfirmPin(pin);
            setPin("");
          }, 300);
        } else {
          // Confirming
          if (pin === confirmPin) {
            sound.playChime();
            onSuccess(pin);
          } else {
            setError(true);
            sound.playTick(); // maybe a buzz sound, but tick is ok
            setTimeout(() => {
              setPin("");
              setError(false);
            }, 600);
          }
        }
      } else {
        // Unlock mode
        if (pin === expectedPin) {
          sound.playChime();
          onSuccess();
        } else {
          setError(true);
          sound.playTick();
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 600);
        }
      }
    }
  }, [pin, isSetupMode, step, confirmPin, expectedPin, onSuccess]);

  const handlePress = (num: number) => {
    if (pin.length < 6) {
      sound.playPop();
      setPin(prev => prev + num);
      setGlowIndex(num);
      setTimeout(() => setGlowIndex(null), 200);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      sound.playTick();
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 select-none overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-indigo-900/30 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
        >
          {isSetupMode ? <ShieldCheck className="w-8 h-8" /> : (pin.length === 6 && !error ? <Unlock className="w-8 h-8" /> : <Lock className="w-8 h-8" />)}
        </motion.div>

        <div className="text-center mb-8 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isSetupMode ? (step === "enter" ? "Create Security PIN" : "Confirm PIN") : "Authentication Required"}
          </h2>
          <p className="text-sm text-slate-400">
            {isSetupMode 
              ? (step === "enter" ? "Secure your local academic workspace with a 6-digit PIN." : "Please re-enter your PIN to confirm.")
              : `Welcome back, ${studentName || 'Scholar'}. Enter your 6-digit PIN to unlock your workspace.`}
          </p>
        </div>

        <motion.div 
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-10"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div 
              key={index} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                index < pin.length 
                  ? (error ? "bg-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "bg-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]")
                  : "bg-transparent border-slate-700"
              }`}
            />
          ))}
        </motion.div>

        <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div key={num} className="flex justify-center">
              <button
                onClick={() => handlePress(num)}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-light transition-all ${
                  glowIndex === num 
                    ? "bg-indigo-500/20 text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.5)] border-indigo-500/50 scale-105" 
                    : "bg-slate-900/50 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white border"
                }`}
              >
                {num}
              </button>
            </div>
          ))}
          <div className="flex justify-center flex-col items-center">
             <button
                onClick={() => {
                   if(isSetupMode && step === "confirm") {
                      setStep("enter");
                      setPin("");
                      setConfirmPin(pin); // hold it conceptually, though we overwrite it anyway when they type 6 digits
                   }
                }}
                className="text-xs text-slate-500 uppercase tracking-widest font-mono"
             >
                {isSetupMode && step === "confirm" ? "RESET" : ""}
             </button>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => handlePress(0)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-light transition-all border ${
                glowIndex === 0
                  ? "bg-indigo-500/20 text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.5)] border-indigo-500/50 scale-105" 
                  : "bg-slate-900/50 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              0
            </button>
          </div>
          <div className="flex justify-center items-center">
            <button
              onClick={handleBackspace}
              className="w-16 h-16 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
