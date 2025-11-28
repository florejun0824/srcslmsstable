// src/components/teacher/BetaWarningModal.jsx

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    const [neverShowAgain, setNeverShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(neverShowAgain);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
            {/* Backdrop:
               - Reduced blur (md instead of xl) per your request.
               - Darker, more neutral overlay for focus.
            */}
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
                aria-hidden="true" 
            />

            {/* Panel Container:
               - "macOS 26" Surface: High opacity white/dark background with subtle translucency.
               - Border: Crisp 1px border for definition.
               - Shadow: Large, soft shadow for lift (elevation).
            */}
            <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-[24px] 
                                   bg-white/95 dark:bg-[#1c1c1e]/95 
                                   backdrop-blur-lg 
                                   border border-white/20 dark:border-white/10
                                   shadow-2xl shadow-black/20 
                                   transition-all duration-300 ease-out">
                
                <div className="p-8">
                    {/* Icon Header */}
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl 
                                  bg-gradient-to-tr from-amber-100 to-orange-50 
                                  dark:from-amber-900/30 dark:to-orange-900/20 
                                  shadow-inner border border-amber-100/50 dark:border-amber-500/20 mb-6">
                        <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    </div>

                    {/* Title & Description */}
                    <div className="text-center">
                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-slate-900 dark:text-white tracking-tight">
                            {title || "Experimental Feature"}
                        </Dialog.Title>
                        <div className="mt-3">
                            <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                                This feature is currently in <strong>Beta</strong>. It uses advanced AI generation which may occasionally produce unexpected results.
                                <br /><br />
                                Please review all generated slides for accuracy before presenting.
                            </p>
                        </div>
                    </div>

                    {/* Checkbox: iOS/macOS Toggle Style */}
                    <div className="mt-6 flex items-center justify-center">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all duration-200 
                                ${neverShowAgain 
                                    ? 'bg-[#007AFF] border-[#007AFF]' 
                                    : 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 group-hover:border-[#007AFF]/50'
                                }`}>
                                {neverShowAgain && (
                                    <svg className="w-3.5 h-3.5 text-white stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                )}
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={neverShowAgain} 
                                    onChange={(e) => setNeverShowAgain(e.target.checked)} 
                                />
                            </div>
                            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 select-none">
                                Don't show this message again
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer / Action Buttons */}
                <div className="bg-slate-50/50 dark:bg-black/20 px-6 py-4 flex gap-3 border-t border-slate-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold 
                                 text-slate-700 dark:text-slate-200 
                                 bg-white dark:bg-white/10 
                                 border border-slate-200 dark:border-white/5
                                 hover:bg-slate-50 dark:hover:bg-white/15 
                                 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-white 
                                 bg-[#007AFF] hover:bg-[#0062CC] 
                                 shadow-lg shadow-blue-500/25 
                                 active:scale-[0.98] transition-all duration-200
                                 flex items-center justify-center gap-2"
                    >
                        <span>Continue</span>
                        <SparklesIcon className="w-4 h-4 opacity-80" />
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}