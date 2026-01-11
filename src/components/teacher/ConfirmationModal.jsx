import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-2xl w-full max-w-md p-6 border border-black/5 dark:border-white/10 animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                    <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
                        <ExclamationTriangleIcon className="w-8 h-8 stroke-[2]" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {title || 'Discard Changes?'}
                    </h3>
                    
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                        {message || 'Are you sure you want to leave? All unsaved work will be lost and cannot be retrieved once you close this session.'}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-[16px] font-bold text-[14px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-all active:scale-95"
                        >
                            Keep Editing
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3.5 rounded-[16px] font-bold text-[14px] text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all active:scale-95"
                        >
                            Discard & Exit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}