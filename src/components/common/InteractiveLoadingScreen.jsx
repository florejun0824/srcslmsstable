import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CpuChipIcon } from '@heroicons/react/24/outline';

const loadingMessages = [
    "Calibrating the knowledge matrix...",
    "Compiling insights...",
    "Syncing with the learning cloud...",
    "Rendering your curriculum...",
    "Optimizing neural pathways...",
    "Assembling educational constructs...",
    "Engaging the creative core...",
    "Initializing the lesson stream...",
    "Polishing the final details...",
    "Structuring the data flow...",
    "Almost there, just a few more calculations...",
    "The digital architect is at work...",
    "Building a seamless learning experience...",
    "Unlocking new potentials...",
    "Crafting with precision and care...",
];

export default function InteractiveLoadingScreen({ isLoading, message, topic, lessonProgress }) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // Robust check: If isLoading is undefined, assume true.
    const shouldShow = isLoading === undefined ? true : isLoading;

    // Cycle through messages
    useEffect(() => {
        if (!shouldShow) return;
        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [shouldShow]);

    if (!shouldShow) return null;

    const currentMessage = message || topic || loadingMessages[currentMessageIndex];

    // Bulletproof progress calculation to prevent NaN errors
    const rawProgress = lessonProgress ? (lessonProgress.current / (lessonProgress.total || 1)) * 100 : 0;
    const progressPercentage = Math.min(100, Math.max(0, isNaN(rawProgress) ? 0 : rawProgress));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ willChange: 'opacity' }}
            // Changed from fixed to absolute to perfectly fill parent containers like GenerationScreen's main tag
            className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ willChange: 'transform, opacity' }}
                className="relative w-full max-w-[340px] mx-4 p-8 md:p-10 rounded-[32px] md:rounded-[40px] 
                           bg-white dark:bg-slate-900 
                           shadow-2xl shadow-indigo-500/10 ring-1 ring-slate-200/60 dark:ring-white/5
                           flex flex-col items-center text-center overflow-hidden"
            >
                {/* Ambient Internal Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[40px] rounded-full pointer-events-none" />

                {/* Ultra Premium Dual-Ring Spinner */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 mb-8 flex items-center justify-center shrink-0">
                    <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }} 
                        className="absolute inset-0 rounded-full border-[3px] border-slate-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-500" 
                    />
                    <motion.div 
                        animate={{ rotate: -360 }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }} 
                        className="absolute inset-2 md:inset-2.5 rounded-full border-[3px] border-transparent border-t-cyan-400 dark:border-t-cyan-400 opacity-70" 
                    />
                    <CpuChipIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>

                {/* Progress Bar Section */}
                {lessonProgress && (
                    <div className="w-full mb-8 relative z-10">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-black/50">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.6, ease: "circOut" }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-3">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                Processing Data
                            </span>
                            <span className="text-[11px] md:text-xs font-black text-indigo-600 dark:text-indigo-400">
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Dynamic Message Section */}
                <div className="h-12 flex items-center justify-center w-full relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentMessage}
                            initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
                            transition={{ duration: 0.3 }}
                            className="text-[13px] md:text-sm font-black text-slate-800 dark:text-white leading-snug tracking-tight"
                        >
                            {currentMessage}
                        </motion.p>
                    </AnimatePresence>
                </div>
                
                {lessonProgress && (
                     <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest relative z-10">
                        Target Module: {lessonProgress.current} / {lessonProgress.total}
                    </p>
                )}
            </motion.div>
        </motion.div>
    );
}