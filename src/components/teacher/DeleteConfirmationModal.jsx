import React, { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
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
    const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200";
    const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`;
    const btnDisabled = "disabled:text-slate-400 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]";

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[120]">
            {/* Overlay */}
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" aria-hidden="true" />
            
            {/* Modal Panel */}
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full max-w-sm rounded-3xl bg-slate-200 p-8 text-center shadow-[8px_8px_16px_#bdc1c6,-8px_-8px_16px_#ffffff]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 mb-5 shadow-[inset_3px_3px_6px_#bdc1c6,inset_-3px_-3px_6px_#ffffff]">
                        <ShieldExclamationIcon className="h-7 w-7 text-red-500" aria-hidden="true" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Confirm Deletion
                    </h2>
                    
                    <p className="text-sm text-slate-600 mb-6">
                        To permanently delete this {deletingItemType || 'item'}, please type{' '}
                        <strong className="font-semibold text-red-600">srcsadmin</strong>{' '}
                        in the box below.
                    </p>
                    
                    <input
                        type="text"
                        placeholder="srcsadmin"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full text-center bg-slate-200 rounded-xl px-4 py-3 text-slate-800 shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                        autoCapitalize="none"
                        autoCorrect="off"
                    />

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <button
                            onClick={handleClose}
                            disabled={isConfirming}
                            className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded} ${btnDisabled}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmClick}
                            disabled={confirmationText !== 'srcsadmin' || isConfirming}
                            className={`${btnBase} bg-red-500 text-white ${btnExtruded} hover:bg-red-600 disabled:bg-slate-200`}
                        >
                            {isConfirming ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}