// src/components/teacher/PresentationGeneratingModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, CpuChipIcon, BoltIcon, CommandLineIcon } from '@heroicons/react/24/outline';

export default function PresentationGeneratingModal({ isOpen, progress, status }) {
    if (!isOpen) return null;

    // Generate random "processing" particles
    const particles = Array.from({ length: 12 });

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]/90 backdrop-blur-xl">
            <div className="relative w-full max-w-lg flex flex-col items-center justify-center p-12">
                
                {/* --- ANIMATED CORE --- */}
                <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                    {/* Outer Rings */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border border-indigo-500/20 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                    />
                    <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 rounded-full border border-purple-500/20 border-b-purple-500"
                    />
                    
                    {/* Inner Pulse */}
                    <div className="relative z-10 w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <SparklesIcon className="w-12 h-12 text-indigo-400" />
                        </motion.div>
                    </div>

                    {/* Orbiting Particles */}
                    {particles.map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_currentColor]"
                            animate={{
                                x: Math.cos(i) * 100, // orbit radius
                                y: Math.sin(i) * 100,
                                scale: [0, 1, 0],
                                opacity: [0, 1, 0]
                            }}
                            transition={{
                                duration: 3 + Math.random(),
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.2
                            }}
                        />
                    ))}
                </div>

                {/* --- STATUS DISPLAY --- */}
                <div className="w-full space-y-6 text-center">
                    <motion.div
                        key={status} // Animate when status changes
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-2"
                    >
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 tracking-tight">
                            {progress < 100 ? "Building Deck..." : "Finalizing..."}
                        </h2>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                            <CommandLineIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span className="text-sm font-mono text-emerald-400">{status || "Initializing neural network..."}</span>
                        </div>
                    </motion.div>

                    {/* --- PROGRESS BAR --- */}
                    <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", bounce: 0 }}
                        />
                        {/* Shimmer Effect */}
                        <motion.div
                            className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                        {Math.round(progress)}% Complete
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}