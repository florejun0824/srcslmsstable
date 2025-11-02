import React, { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, deletingItemType }) {
    const [confirmationText, setConfirmationText] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmClick = async () => {
        // --- MODIFIED: Ensure check is case-insensitive for better UX, though original was strict. Sticking to strict based on context. ---
        if (confirmationText !== 'srcsadmin' || isConfirming) return;
        setIsConfirming(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error("Confirmation failed:", error);
        } finally {
            // The parent component is responsible for closing the modal
            // We only reset the internal loading state
            setIsConfirming(false); 
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

    // Reusable Neumorphic button styles
    const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    // --- MODIFIED: Added dark mode classes for base extrusion ---
    const btnExtruded = `shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark`;
    
    // --- MODIFIED: Added dark mode classes for disabled state ---
    const btnDisabled = "disabled:opacity-60 disabled:shadow-neumorphic-inset dark:disabled:shadow-neumorphic-inset-dark disabled:text-slate-400";
    
    // --- MODIFIED: Added dark mode classes for focus offset ---
    const focusOffsetClass = 'focus:ring-offset-neumorphic-base dark:focus:ring-offset-neumorphic-base-dark';


    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[120]">
            {/* Overlay */}
            {/* --- MODIFIED: Added dark mode backdrop --- */}
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            
            {/* Modal Panel */}
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel 
                    // --- MODIFIED: Added dark mode classes ---
                    className={`w-full max-w-sm rounded-3xl bg-neumorphic-base dark:bg-neumorphic-base-dark p-8 text-center shadow-neumorphic dark:shadow-neumorphic-dark`}
                >
                    {/* Icon Circle */}
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark mb-5 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                        <ShieldExclamationIcon className="h-7 w-7 text-red-500 dark:text-red-400" aria-hidden="true" />
                    </div>
                    
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Confirm Deletion
                    </h2>
                    
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                        To permanently delete this {deletingItemType || 'item'}, please type{' '}
                        <strong className="font-semibold text-red-600 dark:text-red-400">srcsadmin</strong>{' '}
                        in the box below.
                    </p>
                    
                    <input
                        type="text"
                        placeholder="srcsadmin"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        // --- MODIFIED: Added dark mode classes ---
                        className="w-full text-center bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        autoCapitalize="none"
                        autoCorrect="off"
                    />

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <button
                            onClick={handleClose}
                            disabled={isConfirming}
                            // --- MODIFIED: Applied combined styles ---
                            className={`${btnBase} bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 ${btnExtruded} ${btnDisabled} ${focusOffsetClass}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmClick}
                            disabled={confirmationText !== 'srcsadmin' || isConfirming}
                            // --- MODIFIED: Applied combined styles ---
                            className={`${btnBase} bg-red-500 text-white ${btnExtruded} hover:bg-red-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:shadow-none ${focusOffsetClass}`}
                        >
                            {isConfirming ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}