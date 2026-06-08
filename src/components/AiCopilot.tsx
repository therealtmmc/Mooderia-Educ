import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, Loader2, Bot } from "lucide-react";
import { FolderCabinet } from "../types";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiCopilotProps {
  appState: {
    activeTab: string;
    soundOn: boolean;
    folders: FolderCabinet[];
  };
  onNavigate: (tab: "folders" | "quizzes" | "profile" | "analytics") => void;
  onToggleSound: (enabled: boolean) => void;
  onCreateFolder: (name: string, description: string) => void;
}

export default function AiCopilot({ appState, onNavigate, onToggleSound, onCreateFolder }: AiCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am your AI Copilot. I can help navigate the app, control settings, create folders, or answer your academic questions." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          appState
        })
      });

      const data = await res.json();
      
      let finalResponseText = data.text || "";
      
      // Handle functional side-effects
      if (data.functionCalls && data.functionCalls.length > 0) {
        data.functionCalls.forEach((call: any) => {
          try {
            const args = call.args;
            if (call.name === "navigate") {
              onNavigate(args.tab as any);
              if(!finalResponseText) finalResponseText = `Navigating to ${args.tab}...`;
            } else if (call.name === "toggleSound") {
              onToggleSound(args.enabled);
              if(!finalResponseText) finalResponseText = args.enabled ? "Sound enabled." : "Sound muted.";
            } else if (call.name === "createFolder") {
              onCreateFolder(args.name, args.description || "");
              if(!finalResponseText) finalResponseText = `Created folder: ${args.name}.`;
            }
          } catch (err) {
             console.error("Tool execution failed", err);
          }
        });
      }

      if (!finalResponseText) {
        finalResponseText = "Action completed successfully.";
      }

      setMessages(prev => [...prev, { role: "assistant", content: finalResponseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an error connecting to the copilot server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-5 md:bottom-10 md:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(79,70,229,0.5)] z-50 transition-transform ${isOpen ? 'scale-0' : 'scale-100 hover:scale-105 active:scale-95'}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 md:bottom-28 md:right-10 w-[calc(100vw-32px)] md:w-[400px] h-[500px] max-h-[70vh] bg-slate-950/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-indigo-500/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight uppercase">AI Copilot</h3>
                  <p className="text-[10px] text-indigo-300 font-mono tracking-widest">GEMINI 3.5 FLASH</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-5 pb-2 space-y-4 font-mono text-sm">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
                >
                  <span className={`text-[9px] mb-1 opacity-50 uppercase tracking-widest ${msg.role === "user" ? "text-right" : "text-left"}`}>
                    {msg.role === "user" ? "You" : "Copilot"}
                  </span>
                  <div 
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-br-sm" 
                        : "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col max-w-[85%] mr-auto">
                   <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 rounded-bl-sm flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                     Working...
                   </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-white/10 bg-slate-900/60 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI Copilot to navigate..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
