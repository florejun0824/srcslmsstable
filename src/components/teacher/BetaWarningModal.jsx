// src/components/teacher/BetaWarningModal.jsx

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { PresentationChartBarIcon, SparklesIcon, BoltIcon, CpuChipIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURES = [
    { icon: CpuChipIcon, label: "AI-Powered Layout", desc: "Intelligent content structuring" },
    { icon: LightBulbIcon, label: "Smart Scenarios", desc: "Filipino-contextualized examples" },
    { icon: BoltIcon, label: "Instant Export", desc: "One-click to Google Slides" },
];

export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    const [neverShowAgain, setNeverShowAgain] = useState(false);
    const [activeRing, setActiveRing] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setActiveRing(p => (p + 1) % 3), 2500);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleConfirm = () => {
        if (onConfirm) onConfirm(neverShowAgain);
    };

    const ringColors = ['border-indigo-400', 'border-violet-400', 'border-fuchsia-400'];

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={onClose}>
                
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 transition-all" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-400"
                            enterFrom="opacity-0 scale-90 translate-y-6"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-6"
                        >
                            <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl transition-all flex flex-col md:flex-row border border-slate-200 dark:border-slate-800">
                                
                                {/* ===== LEFT PANE: CINEMATIC VISUAL ===== */}
                                <div className="relative w-full md:w-[48%] overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-700 md:min-h-[440px] h-64 flex items-center justify-center">
                                    
                                    {/* Grid texture */}
                                    <div className="absolute inset-0 opacity-[0.08]"
                                         style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                                    
                                    {/* Gradient overlay for depth */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />

                                    {/* Animated rings + Icon */}
                                    <div className="relative z-10 flex items-center justify-center">
                                        {/* Three animated rings */}
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                animate={{ 
                                                    scale: activeRing === i ? [1, 1.3, 1] : 1,
                                                    opacity: activeRing === i ? [0.3, 0.7, 0.3] : 0.15,
                                                }}
                                                transition={{ duration: 2, ease: "easeInOut" }}
                                                className={`absolute rounded-full border-2 ${ringColors[i]}`}
                                                style={{ width: `${90 + i * 30}px`, height: `${90 + i * 30}px` }}
                                            />
                                        ))}
                                        
                                        {/* Core icon */}
                                        <motion.div 
                                            animate={{ rotate: [0, 3, -3, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="relative z-20 w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl"
                                        >
                                            <PresentationChartBarIcon className="h-10 w-10 text-white drop-shadow-lg" />
                                        </motion.div>
                                    </div>

                                    {/* Floating sparkles */}
                                    <motion.div
                                        animate={{ y: [-5, 5, -5], x: [3, -3, 3] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                        className="absolute top-8 right-8"
                                    >
                                        <SparklesIcon className="w-6 h-6 text-amber-300/50" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ y: [5, -5, 5] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                        className="absolute bottom-12 left-10"
                                    >
                                        <SparklesIcon className="w-4 h-4 text-white/30" />
                                    </motion.div>
                                </div>

                                {/* ===== RIGHT PANE: CONTENT ===== */}
                                <div className="flex-1 p-8 md:p-10 text-left relative flex flex-col">
                                    {/* Close */}
                                    <button 
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-20"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>

                                    <div className="flex-1">
                                        {/* Badge */}
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-black uppercase tracking-wider mb-5">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                            </span>
                                            AI Presentation Engine
                                        </div>
                                        
                                        <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                            {title || "Generate Slides"}
                                        </Dialog.Title>

                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                            Our AI engine will analyze your lesson and build a complete slide deck with speaker notes and interactive elements.
                                        </p>

                                        {/* Feature pills */}
                                        <div className="space-y-2.5 mb-6">
                                            {FEATURES.map((feat, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 + i * 0.1 }}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                                                >
                                                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                        <feat.icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{feat.label}</span>
                                                        <span className="text-xs text-slate-400 ml-2">{feat.desc}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="space-y-5 mt-auto pt-5 border-t border-slate-100 dark:border-slate-800">
                                        {/* Checkbox */}
                                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                                            <div className="relative flex items-center justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md 
                                                             checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                                                    checked={neverShowAgain}
                                                    onChange={(e) => setNeverShowAgain(e.target.checked)}
                                                />
                                                <CheckIcon className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                                            </div>
                                            <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                                Don't show this again
                                            </span>
                                        </label>

                                        {/* Buttons */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-3.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 
                                                         bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                                                         transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleConfirm}
                                                className="relative px-4 py-3.5 rounded-xl text-sm font-black text-white 
                                                         bg-gradient-to-r from-indigo-600 to-violet-600 
                                                         hover:from-indigo-500 hover:to-violet-500
                                                         shadow-lg shadow-indigo-500/25
                                                         flex items-center justify-center gap-2 group overflow-hidden
                                                         transition-all active:scale-[0.97]"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                                <span className="relative">Create Deck</span>
                                                <SparklesIcon className="w-4 h-4 relative" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}