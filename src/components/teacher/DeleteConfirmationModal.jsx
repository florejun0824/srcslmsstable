// src/components/teacher/DeleteConfirmationModal.jsx

import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShieldExclamationIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

    // --- ONE UI 8.0 STYLES ---

    // Container: Solid Surface, Super-Squircle, clean shadow
    const containerClass = `w-full max-w-sm transform overflow-hidden rounded-[32px] bg-white dark:bg-[#1C1C1E] p-6 text-center shadow-2xl transition-all border border-transparent dark:border-[#2C2C2E]`;

    // Icon Box: Squircle, Danger Tonal
    const iconBoxClass = `mx-auto mb-5 h-20 w-20 rounded-[26px] flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 shadow-sm`;

    // Input: Deep Field Tonal, Borderless
    const inputClass = `w-full px-5 py-4 rounded-[22px] bg-[#F2F4F7] dark:bg-[#252527] border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-[#2C2C2E] transition-all text-center font-bold text-lg tracking-widest shadow-inner`;

    // Primary Button: Solid Red Pill
    const primaryBtnClass = `w-full inline-flex justify-center items-center gap-2 rounded-[26px] px-6 py-3.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:grayscale`;

    // Secondary Button: Tonal Pill
    const secondaryBtnClass = `w-full inline-flex justify-center rounded-[26px] px-6 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-[#F2F4F7] dark:bg-[#2C2C2E] hover:bg-[#E5E7EB] dark:hover:bg-[#3A3A3C] transition-all active:scale-95`;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[6000]" onClose={handleClose}>
                
                {/* Smooth Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" aria-hidden="true" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        
                        {/* Modal Panel */}
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-8"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-8"
                        >
                            <Dialog.Panel className={containerClass}>
                                
                                {/* 🔴 AUTOFILL TRAP 
                                    These hidden inputs distract password managers from filling the search bar in the background.
                                */}
                                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                                    <input type="text" name="fake_username_trap" tabIndex="-1" />
                                    <input type="password" name="fake_password_trap" tabIndex="-1" />
                                </div>

                                {/* Close Button */}
                                <button 
                                    onClick={handleClose}
                                    className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A3A3C] dark:text-slate-500 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                                </button>

                                {/* Header Section */}
                                <div className="mb-6">
                                    <div className={iconBoxClass}>
                                        <ShieldExclamationIcon className="h-10 w-10 stroke-[1.5]" />
                                    </div>
                                    
                                    <Dialog.Title as="h3" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        Confirm Deletion
                                    </Dialog.Title>
                                    
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 px-2">
                                        You are about to delete this <span className="font-bold text-slate-700 dark:text-slate-200">{deletingItemType || 'item'}</span>. 
                                        This action <span className="text-red-600 dark:text-red-400 font-bold">cannot be undone</span>.
                                    </p>
                                </div>
                                
                                {/* Input Section */}
                                <div className="mb-8 space-y-3 relative">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Admin Authorization
                                    </label>
                                    
                                    <input
                                        id="admin-auth-delete"
                                        name="admin_auth_code_unique_99"
                                        type="password"
                                        placeholder="Enter Admin Code"
                                        value={confirmationText}
                                        onChange={(e) => setConfirmationText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={inputClass}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="new-password" 
                                        data-lpignore="true" 
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleConfirmClick}
                                        disabled={confirmationText !== 'srcsadmin' || isConfirming}
                                        className={primaryBtnClass}
                                    >
                                        {isConfirming ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete Permanently'
                                        )}
                                    </button>

                                    <button
                                        onClick={handleClose}
                                        disabled={isConfirming}
                                        className={secondaryBtnClass}
                                    >
                                        Cancel
                                    </button>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}