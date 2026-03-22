// src/components/WhatsNewModal.jsx
import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, PartyPopper } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import ReactMarkdown from 'react-markdown';

// --- UTILITY: NEO-GLASS MARKDOWN RENDERER ---
const WhatsNewMarkdownRenderer = memo(({ content }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline break-all transition-colors font-semibold" onClick={(e) => e.stopPropagation()} />,
                p: ({node, ...props}) => <p {...props} className="mb-4 last:mb-0 text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed font-sans" />,
                h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-black mt-6 mb-4 text-slate-900 dark:text-white tracking-tight flex items-center gap-2" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mt-5 mb-3 text-slate-800 dark:text-slate-100 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500"/> {props.children}</h2>,
                h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100" />,
                ul: ({node, ...props}) => <ul {...props} className="space-y-3 my-4" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 my-4 space-y-3 font-medium text-slate-700 dark:text-slate-300 marker:text-indigo-500" />,
                li: ({node, ...props}) => (
                    // Neo-Glass micro-card for list items
                    <li className="flex items-start gap-4 p-4 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm group hover:scale-[1.01] hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-300 ease-out">
                        <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                            <Check size={14} strokeWidth={3} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 text-[14px] sm:text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                            {props.children}
                        </div>
                    </li>
                ),
                strong: ({node, ...props}) => <strong {...props} className="font-extrabold text-slate-900 dark:text-white" />,
                em: ({node, ...props}) => <em {...props} className="italic text-slate-600 dark:text-slate-400" />,
                hr: ({node, ...props}) => <hr {...props} className="my-6 border-t-2 border-slate-200/60 dark:border-white/10" />,
                blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-indigo-300 dark:border-indigo-500/30 pl-4 py-1 italic my-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg" />,
                code: ({node, inline, ...props}) => inline 
                    ? <code {...props} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-pink-600 dark:text-pink-400" /> 
                    : <pre className="bg-slate-900 dark:bg-black/50 p-4 rounded-xl overflow-x-auto text-[13px] font-mono text-slate-300 my-4 shadow-inner ring-1 ring-white/10"><code {...props} /></pre>
            }}
        >
            {content}
        </ReactMarkdown>
    );
});

// --- ANIMATION VARIANTS ---
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export default function WhatsNewModal({ versionInfo, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { monetTheme } = useTheme();

  if (!versionInfo) return null;

  const handleClose = () => {
    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipVersion", versionInfo.version);
    } else if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    onClose();
  };

  const rawMarkdown = versionInfo.whatsNew || "No details provided.";

  // Primary Action Color (Fallback to a vibrant M3 blue if no custom theme)
  const primaryColor = 'var(--monet-primary, #4F46E5)'; // indigo-600 baseline

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 p-4 font-sans perspective-1000">

        {/* --- DYNAMIC GLASS BACKDROP --- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
        />

        {/* --- MODAL CONTAINER --- */}
        <motion.div
          initial={{ opacity: 0, y: 100, rotateX: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          exit={{ opacity: 0, y: "100%", scale: 0.95, transition: { duration: 0.3, ease: "easeInOut" } }}
          transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
          className={`
            relative w-full max-w-[500px] max-h-[90vh] sm:max-h-[85vh]
            bg-white/90 dark:bg-[#1C1C1E]/95 
            backdrop-blur-3xl
            rounded-[32px] sm:rounded-[36px]
            shadow-[0_24px_64px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)]
            border border-white/40 dark:border-white/10
            overflow-hidden flex flex-col isolation-auto
          `}
        >
          {/* Subtle Inner Glow Border for Glass Effect */}
          <div className="absolute inset-0 rounded-[32px] sm:rounded-[36px] border border-white/20 pointer-events-none z-10 mix-blend-overlay"></div>

          {/* --- HERO HEADER / AMBIENT GLOW --- */}
          <div className="relative pt-12 pb-8 w-full flex-shrink-0 flex flex-col items-center justify-center overflow-hidden">

            {/* Ambient Animated Blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-blue-400/30 dark:bg-blue-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[40px] animate-pulse"></div>
              <div className="absolute top-[10%] right-[-10%] w-56 h-56 bg-sky-300/30 dark:bg-sky-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[40px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Content Container (Above Blurs) */}
            <div className="relative z-10 flex flex-col items-center text-center px-8">
              {/* Stunning Squaricle Icon */}
              <motion.div
                animate={{ y: [-3, 3, -3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-24 h-24 rounded-[1.75rem] bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5 border border-white/20"
              >
                <div className="absolute inset-0 bg-white/20 rounded-[1.75rem] blur-[2px] mix-blend-overlay" />
                <Sparkles size={44} className="text-white relative z-10 drop-shadow-md" strokeWidth={1.5} />

                {/* Tiny Version Badge floating on icon */}
                <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 z-20">
                  <PartyPopper size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-800 dark:text-white tracking-widest uppercase">
                    v{versionInfo.version}
                  </span>
                </div>
              </motion.div>

              <h2 className="text-[28px] sm:text-[32px] font-black tracking-tight text-slate-900 dark:text-white leading-tight mb-2">
                What's New in SRCS
              </h2>
              <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 max-w-[320px] leading-relaxed">
                We've upgraded your learning experience with stunning speed and design.
              </p>
            </div>
          </div>

          {/* --- RELEASE NOTES LIST --- */}
          <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <WhatsNewMarkdownRenderer content={rawMarkdown} />
            </motion.div>
          </div>

          {/* --- BOTTOM ACTIONS --- */}
          <div className="px-6 py-6 pb-8 sm:pb-6 bg-slate-50/80 dark:bg-black/30 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10 rounded-b-[32px] sm:rounded-b-[36px]">

            {/* Neo-MD3 iOS Hybrid Switch */}
            <label className="flex items-center gap-3 cursor-pointer group origin-left tap-highlight-transparent active:scale-[0.98] transition-transform">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                {/* Track */}
                <div className={`
                        w-[48px] h-[28px] rounded-full transition-colors duration-300 ease-in-out border-2 shadow-inner
                        ${dontShowAgain ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' : 'border-transparent bg-slate-200 dark:bg-white/10'}
                    `}></div>
                {/* Thumb */}
                <div className={`
                        absolute bg-white rounded-full transition-all duration-300 ease-in-out shadow-sm flex items-center justify-center border border-slate-100 dark:border-transparent
                        ${dontShowAgain
                    ? 'w-[24px] h-[24px] left-[2px] top-[2px] translate-x-[20px] scale-100'
                    : 'w-[20px] h-[20px] left-[4px] top-[4px] translate-x-0 group-hover:scale-110 group-active:scale-125 dark:bg-slate-300'}
                    `}>
                  {dontShowAgain && (
                    <Check size={14} className="text-blue-600 font-bold" strokeWidth={3.5} />
                  )}
                </div>
              </div>
              <span className="text-[14px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors tracking-wide select-none">
                Don't show this again
              </span>
            </label>

            {/* Premium Pilled Button */}
            <button
              onClick={handleClose}
              className="relative overflow-hidden h-[48px] px-8 rounded-full font-bold text-[15px] tracking-wide text-white transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 group sm:w-auto w-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
              <span className="relative z-10">Continue to Dashboard</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}