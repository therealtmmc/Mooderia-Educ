import React, { useState, useEffect } from "react";
import { 
  loginWithGoogle
} from "../firebase/authService";
import { auth } from "../firebase/config";
import { sound } from "../utils/sound";
import { 
  GraduationCap, 
  RefreshCw, 
  Chrome, 
  Sparkles
} from "lucide-react";

interface SignInViewProps {
  onVerificationCheckSuccess: () => void;
}

export default function SignInView({ onVerificationCheckSuccess }: SignInViewProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Monitor auth status if already verified
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      onVerificationCheckSuccess();
    }
  }, [onVerificationCheckSuccess]);

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsLoading(true);
    sound.playChime();
    try {
      const user = await loginWithGoogle();
      if (user) {
        sound.playChime();
        onVerificationCheckSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed Google authentication credentials scan.");
      sound.playPop();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative selection:bg-indigo-600/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-8 hover:border-slate-750 transition-colors">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg p-2 overflow-hidden">
            <GraduationCap className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase mt-2">
            MOODERIA <span className="text-indigo-500">EDUCATION</span>
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Academic Portfolio &amp; Recall Engine
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-white uppercase font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>STUDENT WORKSPACE ENTRY</span>
          </p>
          <p className="leading-relaxed">
            Mooderia matches your workspace directly with secure cloud systems. Authenticate exclusively with your 
            <span className="text-indigo-400 font-bold"> Google Account</span> to enable secure cloud backups, digital flashcards, and automated Google Drive synchronization.
          </p>
        </div>

        {/* EXCLUSIVE CHANNEL: GOOGLE SIGN-IN */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer group shadow-lg shadow-indigo-950/50 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Chrome className="w-4.5 h-4.5 text-white fill-current group-hover:scale-110 transition-transform" />
            )}
            <span>{isLoading ? "Signing in..." : "Continue with Google Account"}</span>
          </button>

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/30 rounded-xl text-xs text-rose-400 text-left leading-normal font-sans">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="text-center pt-2 border-t border-slate-850/60 text-[10px] font-mono text-slate-550">
          SECURE STUDENT SINGLE SIGN-ON
        </div>
      </div>
    </div>
  );
}
