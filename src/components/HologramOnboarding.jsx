// src/components/common/WhatsNewModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, PartyPopper } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function WhatsNewModal({ versionInfo, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { monetTheme } = useTheme();

  if (!versionInfo) return null;

  const handleClose = () => {
    // 1. Save preferences first
    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipVersion", versionInfo.version);
    } else if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    
    // 2. Trigger Hard Refresh
    window.location.reload();
  };

  const notes = versionInfo.whatsNew
    ? versionInfo.whatsNew.split("\n").filter((line) => line.trim() !== "")
    : ["No details provided."];

  // Dynamic Styles
  const primaryColor = 'var(--monet-primary)';
  const primaryLight = 'var(--monet-primary-transparent)'; 

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // We remove the onClick handler here so accidental clicks don't trigger the reload unexpectedly
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`
            relative w-full max-w-md
            bg-white/95 dark:bg-[#1A1D24]/95 
            backdrop-blur-2xl backdrop-saturate-150
            rounded-[2rem] shadow-2xl 
            border border-white/20 dark:border-white/5
            flex flex-col 
            max-h-[80vh] sm:max-h-[85vh]
            overflow-hidden
          `}
        >
          
          {/* --- HEADER --- */}
          <div className="flex-none relative pt-8 pb-4 px-6 text-center z-10 border-b border-transparent">
            {/* Icon Circle */}
            <div 
              className="mx-auto w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-lg mb-4 text-white"
              style={{ background: primaryColor }}
            >
              <Sparkles size={32} fill="currentColor" className="text-white/90" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              What's New
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-500 dark:text-slate-300">
              <PartyPopper size={12} />
              <span>Version {versionInfo.version}</span>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 custom-scrollbar">
            <div className="space-y-3">
              {notes.map((line, i) => (
                <div 
                  key={i}
                  className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50/80 dark:bg-black/20 border border-slate-100 dark:border-white/5"
                >
                  <div 
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryLight }}
                  >
                    <Check size={12} style={{ color: primaryColor }} strokeWidth={3} />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* --- FOOTER ACTIONS --- */}
          <div className="flex-none p-6 bg-white dark:bg-[#1A1D24] border-t border-slate-100 dark:border-white/5 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            
            {/* Toggle: Don't show again */}
            <label className="flex items-center justify-between mb-5 cursor-pointer group select-none">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                Don't show this again
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <div 
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-300
                    bg-slate-200 dark:bg-slate-700
                  `}
                  style={dontShowAgain ? { backgroundColor: primaryColor } : {}}
                ></div>
                <div 
                  className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 peer-checked:translate-x-full shadow-sm"
                ></div>
              </div>
            </label>

            {/* Main Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-[1.2rem] font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: primaryColor }}
            >
              <span>Awesome, got it!</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}