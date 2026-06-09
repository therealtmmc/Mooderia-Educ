import React, { useState, useEffect } from "react";
import { 
  loginWithGoogle, 
  signInWithEmail, 
  signUpWithEmail 
} from "../firebase/authService";
import { auth } from "../firebase/config";
import { sound } from "../utils/sound";
import { 
  GraduationCap, 
  ArrowRight, 
  Mail, 
  Lock, 
  RefreshCw, 
  Chrome, 
  Sparkles, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface SignInViewProps {
  onVerificationCheckSuccess: () => void;
}

export default function SignInView({ onVerificationCheckSuccess }: SignInViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verification stage state
  const [isVerificationDispatched, setIsVerificationDispatched] = useState(false);
  const [isCheckingReload, setIsCheckingReload] = useState(false);

  // Monitor auth status if already verified
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.emailVerified) {
      onVerificationCheckSuccess();
    } else if (user && !user.emailVerified) {
      setIsVerificationDispatched(true);
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

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please key in both valid email and authentication credentials.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    sound.playTick();

    try {
      if (isSignUp) {
        // CHANNEL B: Registration & Verification Dispatch
        const user = await signUpWithEmail(email.trim(), password.trim());
        if (user) {
          setIsVerificationDispatched(true);
          sound.playChime();
        }
      } else {
        // CHANNEL B: Login
        const user = await signInWithEmail(email.trim(), password.trim());
        if (user) {
          if (!user.emailVerified) {
            setIsVerificationDispatched(true);
            setErrorMessage("Please authenticate the magic link verified portal on your email.");
          } else {
            sound.playChime();
            onVerificationCheckSuccess();
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Authentication credentials failed on active directory checking.");
      sound.playPop();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckReload = async () => {
    setIsCheckingReload(true);
    setErrorMessage("");
    sound.playTick();
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (auth.currentUser?.emailVerified) {
          sound.playChime();
          onVerificationCheckSuccess();
        } else {
          setErrorMessage("Verification link is not completed yet. Please check your spam folder or wait 1 min.");
          sound.playPop();
        }
      } else {
        setErrorMessage("Critical reference check: No active authenticator user session located.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Checking failed. Please verify internet coordinates.");
    } finally {
      setIsCheckingReload(false);
    }
  };

  const handleSignOutReset = async () => {
    sound.playTick();
    try {
      await auth.signOut();
      setIsVerificationDispatched(false);
      setErrorMessage("");
    } catch (e) {
      // ignore
    }
  };

  if (isVerificationDispatched) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative selection:bg-indigo-600/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

        <div className="w-full max-w-md relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 text-center hover:border-indigo-500/20 transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500" />
          
          <div className="mx-auto w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg text-4xl animate-bounce">
            📬
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase font-display">
              Check your inbox!
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              We sent a <span className="text-indigo-400 font-bold">magic portal verification link</span> to <span className="text-white font-semibold underline">{auth.currentUser?.email}</span>.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl text-xs text-slate-400 text-left space-y-2">
            <p className="font-bold text-teal-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Next Steps for Students</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
              <li>Open your personal email app (Gmail, Yahoo, Outlook, etc.).</li>
              <li>Locate the automated verification email from <span className="font-semibold text-slate-300">Mooderia Education</span> / Firebase.</li>
              <li>Click the secure validation link inside the message.</li>
              <li>Return to this page and click the button below!</li>
            </ol>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/30 rounded-xl text-xs text-rose-400 text-left">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckReload}
              disabled={isCheckingReload}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCheckingReload ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>Verify &amp; Refresh Session</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOutReset}
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Back to Sign-In Channels
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-white uppercase font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>STUDENT WORKSPACE ENTRY</span>
          </p>
          <p>Please log in using your student email account credentials or Google Authentication popup to access verified portfolios.</p>
        </div>

        {/* CHANNEL A: GOOGLE SIGN-IN */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/30 text-xs font-bold text-slate-250 rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer group shadow-sm disabled:opacity-50"
          >
            <Chrome className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            <span>Continue with Google Account</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-850" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">OR INDEPENDENT LOGIN</span>
            <div className="flex-1 h-px bg-slate-850" />
          </div>
        </div>

        {/* CHANNEL B: EMAIL AUTHENTICATION FORM */}
        <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Student Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. name@university.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Password Key</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/30 rounded-xl text-xs text-rose-400 text-left leading-normal font-sans">
              {errorMessage}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isSignUp ? "Initialize Profile & Register" : "Unlock Workspace Client"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-3 border-t border-slate-850/60 mt-3">
            <button
              type="button"
              onClick={() => {
                sound.playTick();
                setIsSignUp(!isSignUp);
                setErrorMessage("");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
            >
              {isSignUp ? "Already have an account? Log In" : "New student? Create a secure account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
