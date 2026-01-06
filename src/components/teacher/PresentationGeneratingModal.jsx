// src/components/teacher/PresentationGeneratingModal.jsx
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { SparklesIcon, CpuChipIcon } from '@heroicons/react/24/solid';

export default function PresentationGeneratingModal({ isOpen, progress, status }) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={() => {}}>
                {/* Backdrop with strong blur for focus */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-500"
                    enterFrom="opacity-0 backdrop-blur-none"
                    enterTo="opacity-100 backdrop-blur-xl"
                    leave="ease-in duration-300"
                    leaveFrom="opacity-100 backdrop-blur-xl"
                    leaveTo="opacity-0 backdrop-blur-none"
                >
                    <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 transition-all" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-500"
                            enterFrom="opacity-0 scale-90 translate-y-8"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-300"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-8"
                        >
                            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl p-8 text-left align-middle shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-white/20 dark:ring-white/5 transition-all relative">
                                
                                {/* Background Ambient Glow */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none"></div>

                                <div className="relative flex flex-col items-center justify-center text-center">
                                    {/* Animated Icon Container */}
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full animate-pulse opacity-20 blur-xl"></div>
                                        <div className="relative w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-blue-500/30">
                                            <SparklesIcon className="w-10 h-10 text-white animate-spin-slow" />
                                        </div>
                                        {/* Floating Badge */}
                                        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#2C2C2E] p-1.5 rounded-full shadow-md border border-slate-100 dark:border-white/10">
                                            <CpuChipIcon className="w-4 h-4 text-blue-500" />
                                        </div>
                                    </div>

                                    {/* Typography */}
                                    <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                                        Crafting Magic
                                    </Dialog.Title>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 max-w-[80%] leading-relaxed">
                                        {status || "Analyzing your lesson content to generate the perfect slides..."}
                                    </p>

                                    {/* Progress Indicator */}
                                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 mb-2 overflow-hidden relative">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${Math.max(5, progress)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span>AI Processing</span>
                                        <span>{progress}%</span>
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