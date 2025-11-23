import React, { useState, Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, deletingItemType }) {
    const [confirmationText, setConfirmationText] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmClick = async () => {
        if (confirmationText !== 'srcsadmin' || isConfirming) return;
        setIsConfirming(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error("Confirmation failed:", error);
        } finally {
            setIsConfirming(false);
            // Reset text when operation finishes or fails
            setConfirmationText(''); 
        }
    };

    const handleClose = () => {
        if (isConfirming) return;
        setConfirmationText('');
        onClose();
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && confirmationText === 'srcsadmin') {
            e.preventDefault();
            handleConfirmClick();
        }
    };

    // --- DESIGN SYSTEM CONSTANTS ---
    const glassInput = "w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-4 text-center text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-lg tracking-widest";
    
    const primaryBtn = `
        w-full py-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-500/30 
        bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 
        border border-red-400/20 active:scale-[0.98] transition-all duration-200
        disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none
    `;

    const secondaryBtn = `
        w-full py-4 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 
        bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 
        active:scale-[0.98] transition-all duration-200
    `;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={handleClose}>
                
                {/* Backdrop */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        
                        {/* Modal Panel */}
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 text-center shadow-2xl transition-all">
                                
                                {/* Icon with Glow Effect */}
                                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">
                                    <div className="absolute inset-0 rounded-full bg-red-500 blur-2xl opacity-20"></div>
                                    <ShieldExclamationIcon className="h-10 w-10 relative z-10" aria-hidden="true" strokeWidth={1.5} />
                                </div>
                                
                                <DialogTitle as="h3" className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                    Confirm Deletion
                                </DialogTitle>
                                
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-8 px-4">
                                    You are about to permanently delete this <span className="font-bold text-slate-700 dark:text-slate-200">{deletingItemType || 'item'}</span>. 
                                    <br/>
                                    This action <span className="text-red-500 font-bold">cannot be undone</span>.
                                </p>
                                
                                {/* Input Section */}
                                <div className="mb-8 space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        Admin Authorization
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter Admin Code"
                                        value={confirmationText}
                                        onChange={(e) => setConfirmationText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={glassInput}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleClose}
                                        disabled={isConfirming}
                                        className={secondaryBtn}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmClick}
                                        disabled={confirmationText !== 'srcsadmin' || isConfirming}
                                        className={primaryBtn}
                                    >
                                        {isConfirming ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            'Delete Permanently'
                                        )}
                                    </button>
                                </div>

                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}