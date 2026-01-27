// src/components/HologramOnboarding.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, PartyPopper, ArrowRight, Layers, Zap } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// --- CUSTOM COMPONENT: THE QUANTUM CORE ---
// A code-only, high-performance holographic animation
const QuantumCore = ({ primaryColor }) => {
  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
      {/* 1. Ambient Glow (The Aura) */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full blur-[40px]"
        style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}
      />

      {/* 2. Outer Gyroscope Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-full rounded-full border border-slate-400/20 dark:border-white/10 border-dashed"
        style={{ borderTopColor: primaryColor, borderWidth: '2px' }}
      />

      {/* 3. Middle Orbit Ring (Counter-Rotating) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-3/4 h-3/4 rounded-full border border-slate-400/30 dark:border-white/20"
        style={{ borderLeftColor: primaryColor, borderWidth: '1px' }}
      />

      {/* 4. The Core "Gem" (Floating Cube Metaphor) */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.9, 1, 0.9], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-16 h-16 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/20 shadow-2xl flex items-center justify-center overflow-hidden"
      >
        {/* Shine Effect inside the Gem */}
        <motion.div
          animate={{ top: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute left-0 right-0 h-10 bg-gradient-to-b from-white/0 via-white/40 to-white/0 -rotate-45 transform"
        />
        {/* Core Icon */}
        <Layers className="w-8 h-8 text-slate-700 dark:text-white drop-shadow-lg" strokeWidth={1.5} />
      </motion.div>

      {/* 5. Floating Particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: primaryColor }}
          animate={{
            y: [-20, 20, -20],
            x: i % 2 === 0 ? [-10, 10, -10] : [10, -10, 10],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
};

export default function HologramOnboarding({ versionInfo, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { monetTheme } = useTheme();

  if (!versionInfo) return null;

  const handleClose = () => {
    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipHologramVersion", versionInfo.version);
    }
    if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    onClose();
  };

  const notes = versionInfo.whatsNew
    ? versionInfo.whatsNew.split("\n").filter((line) => line.trim() !== "")
    : ["Performance improvements and bug fixes."];

  const primaryColor = 'var(--monet-primary, #6366f1)';

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center font-sans overflow-hidden">
      
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Main Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`
          relative w-full max-w-4xl mx-4 sm:mx-6 
          bg-white/80 dark:bg-[#121212]/90 
          backdrop-blur-2xl backdrop-saturate-150
          rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10
          overflow-hidden flex flex-col md:flex-row
          max-h-[85vh] md:h-[600px]
        `}
      >
        
        {/* --- LEFT PANEL: The "Quantum" Experience --- */}
        <div className="relative w-full md:w-2/5 overflow-hidden bg-slate-50 dark:bg-black/40 flex flex-col items-center justify-center p-8 md:p-10 shrink-0 text-center">
          
          {/* Background Gradient Mesh */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div 
               className="absolute top-0 right-0 w-[150%] h-[150%] blur-[80px] animate-pulse-slow"
               style={{ background: `radial-gradient(circle at 100% 0%, ${primaryColor}, transparent 50%)` }}
             />
          </div>

          {/* THE NEW VISUAL */}
          <div className="mb-8 scale-110">
            <QuantumCore primaryColor={primaryColor} />
          </div>

          {/* Text Content */}
          <div className="relative z-10 max-w-xs mx-auto">
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight mb-3">
              What's New
            </motion.h2>
            
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-white/10 border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm">
               <Zap size={14} className="text-amber-500 fill-current" />
               <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Version {versionInfo.version}</span>
            </motion.div>
          </div>
        </div>

        {/* --- RIGHT PANEL: Content --- */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-transparent">
          
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
             <div className="space-y-4">
               {notes.map((note, i) => (
                 <motion.div 
                   key={i}
                   variants={itemVariants}
                   whileHover={{ scale: 1.01, x: 4 }}
                   className="group flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md"
                 >
                   <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-white/10 shadow-sm border border-slate-100 dark:border-white/5">
                     <Check size={14} style={{ color: primaryColor }} strokeWidth={3} />
                   </div>
                   <p className="text-sm md:text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                     {note}
                   </p>
                 </motion.div>
               ))}
             </div>
          </div>

          <div className="p-6 md:p-10 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-[#151515]/50 backdrop-blur-xl">
             <div className="flex flex-col gap-6">
               <div onClick={() => setDontShowAgain(!dontShowAgain)} className="flex items-center gap-3 cursor-pointer group select-none">
                 <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${dontShowAgain ? 'bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow-sm transform transition-transform duration-300 ease-spring ${dontShowAgain ? 'translate-x-5' : 'translate-x-0'}`} />
                 </div>
                 <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                   Don't show this again for v{versionInfo.version}
                 </span>
               </div>

               <button onClick={handleClose} className="group relative w-full py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all overflow-hidden">
                 <div className="absolute inset-0 transition-opacity duration-300" style={{ background: primaryColor }} />
                 <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center justify-center gap-3">
                   <span>Awesome, got it</span>
                   <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </div>
               </button>
             </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}