// src/components/teacher/BetaWarningModal.jsx

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PresentationChartBarIcon, SparklesIcon } from '@heroicons/react/24/solid';

export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    const [neverShowAgain, setNeverShowAgain] = useState(false);
    const [activeColorIndex, setActiveColorIndex] = useState(0);

    // Color Cycle Logic (Every 2 seconds)
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setActiveColorIndex((prev) => (prev + 1) % 4);
        }, 2000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleConfirm = () => {
        if (onConfirm) onConfirm(neverShowAgain);
    };

    // Color Configurations for the Icon & Glows
    const colors = [
        { // 1. Cyan (Default)
            text: 'text-cyan-50',
            glow: 'bg-cyan-500/30',
            shadow: 'drop-shadow-[0_0_25px_rgba(34,211,238,0.8)]',
            ring: 'border-cyan-400/30'
        },
        { // 2. Indigo
            text: 'text-indigo-50',
            glow: 'bg-indigo-500/30',
            shadow: 'drop-shadow-[0_0_25px_rgba(99,102,241,0.8)]',
            ring: 'border-indigo-400/30'
        },
        { // 3. Fuchsia/Pink
            text: 'text-fuchsia-50',
            glow: 'bg-fuchsia-500/30',
            shadow: 'drop-shadow-[0_0_25px_rgba(232,121,249,0.8)]',
            ring: 'border-fuchsia-400/30'
        },
        { // 4. Teal/Emerald
            text: 'text-teal-50',
            glow: 'bg-teal-500/30',
            shadow: 'drop-shadow-[0_0_25px_rgba(45,212,191,0.8)]',
            ring: 'border-teal-400/30'
        }
    ];

    const current = colors[activeColorIndex];

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={onClose}>
                
                {/* 1. Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-500"
                    enterFrom="opacity-0 backdrop-blur-none"
                    enterTo="opacity-100 backdrop-blur-md"
                    leave="ease-in duration-300"
                    leaveFrom="opacity-100 backdrop-blur-md"
                    leaveTo="opacity-0 backdrop-blur-none"
                >
                    <div className="fixed inset-0 bg-[#050814]/70 transition-all" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 scale-95 translate-y-8"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-8"
                        >
                            <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-[32px] bg-white dark:bg-[#0f1014] shadow-2xl transition-all flex flex-col md:flex-row ring-1 ring-black/5 dark:ring-white/10">
                                
                                {/* -----------------------
                                    LEFT PANE: DYNAMIC VISUALS
                                ------------------------ */}
                                <div className="relative w-full md:w-[45%] overflow-hidden bg-slate-900 md:h-auto h-64 flex items-center justify-center isolate">
                                    
                                    {/* A. User Image & Tint */}
                                    <img 
                                        src="/srcs.jpg" 
                                        alt="" 
                                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-blue-900/60 mix-blend-multiply" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-blue-950/60 to-indigo-900/40" />

                                    {/* B. Cinematic Noise */}
                                    <div className="absolute inset-0 opacity-20 mix-blend-overlay" 
                                         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
                                    />

                                    {/* C. THE COLOR-CHANGING SONAR */}
                                    <div className="relative z-10 flex items-center justify-center">
                                        
                                        {/* 1. Outer Ring Ripple (Follows current color) */}
                                        <div 
                                            className={`absolute w-24 h-24 rounded-full border opacity-0 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] transition-colors duration-1000 ${current.ring}`} 
                                            style={{ animationDelay: '0.5s' }}
                                        />
                                        
                                        {/* 2. Inner Ring Ripple */}
                                        <div 
                                            className="absolute w-24 h-24 rounded-full border border-white/20 opacity-0 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" 
                                            style={{ animationDelay: '0s' }}
                                        />
                                        
                                        {/* 3. Core Color Glow (Breathing Effect + Color Cycle) */}
                                        <div className={`absolute w-16 h-16 rounded-full blur-xl animate-[pulse_4s_ease-in-out_infinite] transition-colors duration-1000 ${current.glow}`} />
                                        <div className={`absolute w-12 h-12 rounded-full blur-lg animate-pulse bg-white/10`} />

                                        {/* 4. The Icon (Color Cycle) */}
                                        <div className="relative z-20">
                                            <PresentationChartBarIcon 
                                                className={`h-16 w-16 transition-all duration-1000 ${current.text} ${current.shadow}`} 
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* -----------------------
                                    RIGHT PANE: CONTENT
                                ------------------------ */}
                                <div className="flex-1 p-8 md:p-10 text-left relative flex flex-col h-full bg-white dark:bg-[#0f1014]">
                                    {/* Close Button */}
                                    <button 
                                        onClick={onClose}
                                        className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors z-20"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>

                                    <div className="flex-1">
                                        {/* Badge */}
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-6">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            AI Presentation
                                        </div>
                                        
                                        <Dialog.Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                            {title || "Generating Slides"}
                                        </Dialog.Title>
                                        
                                        <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                            <p>
                                                You're using our experimental AI engine to build this deck. The system is scanning for the best layouts and content for your topic.
                                            </p>
                                            <p className="font-medium text-slate-800 dark:text-blue-200">
                                                Please review the generated slides before presenting.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer Section */}
                                    <div className="space-y-6 mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                                        {/* Checkbox */}
                                        <label className="flex items-start gap-3 cursor-pointer group select-none">
                                            <div className="relative flex items-center justify-center mt-0.5">
                                                <input 
                                                    type="checkbox" 
                                                    className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-[6px] 
                                                             checked:bg-blue-600 checked:border-blue-600 
                                                             dark:checked:bg-blue-600 dark:checked:border-blue-600
                                                             transition-all"
                                                    checked={neverShowAgain}
                                                    onChange={(e) => setNeverShowAgain(e.target.checked)}
                                                />
                                                <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none scale-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium text-slate-700 dark:text-slate-200 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Don't show this again</span>
                                                <span className="text-slate-400 text-xs">Preferences saved for this session.</span>
                                            </div>
                                        </label>

                                        {/* Buttons */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-3 rounded-xl text-sm font-semibold 
                                                         text-slate-600 dark:text-slate-300 
                                                         bg-slate-50 dark:bg-white/5 
                                                         hover:bg-slate-100 dark:hover:bg-white/10 
                                                         transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleConfirm}
                                                className="relative px-4 py-3 rounded-xl text-sm font-semibold text-white 
                                                         bg-slate-900 dark:bg-blue-600 
                                                         hover:bg-slate-800 dark:hover:bg-blue-500
                                                         shadow-[0_4px_20px_-5px_rgba(37,99,235,0.4)]
                                                         flex items-center justify-center gap-2 group overflow-hidden
                                                         transition-all active:scale-[0.98]"
                                            >
                                                {/* Button Inner Shine */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                                
                                                <span className="relative">Create Deck</span>
                                                <SparklesIcon className="w-4 h-4 relative opacity-80" />
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