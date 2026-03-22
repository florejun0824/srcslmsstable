// src/components/teacher/PresentationGeneratingModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';

const STAGE_TIPS = [
    "Structuring visual layouts for maximum impact...",
    "Applying pedagogical principles to slide flow...",
    "Optimizing content density per slide...",
    "Adding speaker note scaffolding for delivery...",
    "Balancing text and visual breathing room...",
];

export default function PresentationGeneratingModal({ isOpen, progress, status }) {
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % STAGE_TIPS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) return null;

    const rings = Array.from({ length: 3 });

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
            
            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            
            {/* Radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-400/15 dark:bg-violet-500/15 rounded-full blur-[80px]" />
            <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-sky-200/40 dark:bg-sky-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[8s]" />

            <div className="relative w-full max-w-md flex flex-col items-center justify-center px-8 z-10">

                {/* --- ANIMATED ORB --- */}
                <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                    {/* Spinning rings */}
                    {rings.map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                            transition={{ duration: 12 + i * 6, repeat: Infinity, ease: "linear" }}
                            className="absolute rounded-full border border-dashed"
                            style={{
                                inset: `${i * 18}px`,
                                borderColor: `rgba(99, 102, 241, ${0.1 + i * 0.1})`,
                                borderWidth: i === 0 ? '1.5px' : '1px',
                            }}
                        />
                    ))}

                    {/* Center orb */}
                    <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-sm mix-blend-overlay"></div>
                        <motion.div
                            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative z-10"
                        >
                            <PresentationChartBarIcon className="w-10 h-10 text-white drop-shadow-md stroke-2" />
                        </motion.div>
                        
                        {/* Orbiting sparkles */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="absolute w-full h-full"
                        >
                            <SparklesIcon className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-300 drop-shadow-md" />
                        </motion.div>
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                            className="absolute w-full h-full"
                        >
                            <SparklesIcon className="absolute -bottom-2 right-1/4 w-4 h-4 text-violet-200 drop-shadow-md" />
                        </motion.div>
                    </div>
                </div>

                {/* --- MAIN HEADING --- */}
                <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight text-center mb-3">
                    {progress < 100 ? "Building Deck" : "Almost Done..."}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-semibold text-center mb-10 tracking-wide">
                    AI is analyzing your lesson content
                </p>

                {/* --- PROGRESS BAR --- */}
                <div className="w-full mb-6 relative">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">Progress</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    {/* Track */}
                    <div className="relative w-full h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-slate-300/50 dark:border-white/5 backdrop-blur-sm">
                        {/* Fill */}
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                        />
                        {/* Shimmer overlay */}
                        <motion.div
                            className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </div>

                {/* --- LIVE STATUS --- */}
                <div className="w-full space-y-4">
                    <motion.div
                        key={status}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-5 py-3.5 bg-white/80 dark:bg-slate-800/80 rounded-[16px] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md"
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse shrink-0" />
                        <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300 truncate tracking-wide">{status || "Initializing..."}</span>
                    </motion.div>

                    {/* Rotating tip */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tipIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.4 }}
                            className="flex items-start gap-3 px-2 py-1"
                        >
                            <SparklesIcon className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{STAGE_TIPS[tipIndex]}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>,
        document.body
    );
}