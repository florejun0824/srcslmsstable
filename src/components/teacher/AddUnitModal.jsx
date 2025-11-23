// src/components/teacher/AddUnitModal.jsx
import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { PlusCircleIcon } from '@heroicons/react/24/solid';

export default function AddUnitModal({ isOpen, onClose, subjectId, onCreateUnit }) {
    const [unitTitle, setUnitTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddUnit = async () => {
        if (!unitTitle.trim()) {
            setError('Unit title cannot be empty.');
            return;
        }
        if (!subjectId) {
            setError('No subject selected. Cannot create unit.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const unitData = {
                title: unitTitle,
                subjectId: subjectId,
                createdAt: new Date(),
            };
            await onCreateUnit(unitData);
            handleClose(); // Close on success
        } catch (err) {
            console.error("Error callback in AddUnitModal:", err);
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };
  
    const handleClose = () => {
        setUnitTitle('');
        setError('');
        onClose();
    };

    return (
        <Dialog 
            open={isOpen} 
            onClose={handleClose} 
            className="relative z-[6000]"
        >
            {/* Backdrop with deep blur */}
            <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                {/* Modal Panel - Ultra-Glass Style */}
                <Dialog.Panel 
                    className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] 
                               bg-white/90 dark:bg-[#16181D]/90 backdrop-blur-3xl 
                               p-8 text-left align-middle shadow-2xl shadow-slate-400/20 dark:shadow-black/60 
                               border border-white/60 dark:border-white/5 
                               ring-1 ring-slate-900/5 transition-all animate-in fade-in zoom-in-95 duration-300 scale-100"
                >
                    {/* Icon Header with Ambient Bloom */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            {/* Bloom behind icon */}
                            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                            <div className="relative h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                                <PlusCircleIcon className="h-8 w-8 text-white drop-shadow-sm" />
                            </div>
                        </div>
                        <Dialog.Title as="h3" className="mt-5 text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
                            Add New Unit
                        </Dialog.Title>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                            Organize lessons within a new unit.
                        </p>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={(e) => { e.preventDefault(); handleAddUnit(); }}>
                        <div className="mb-8">
                            <div className="relative group">
                                <input
                                    id="unit-title"
                                    type="text"
                                    value={unitTitle}
                                    onChange={(e) => setUnitTitle(e.target.value)}
                                    placeholder="e.g., Unit 1: The Cell"
                                    className="w-full px-5 py-4 rounded-2xl 
                                               bg-slate-100/80 dark:bg-black/40 
                                               border border-transparent focus:border-blue-500/50 
                                               text-slate-900 dark:text-white text-center font-semibold text-lg
                                               placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal
                                               focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-black/60
                                               transition-all duration-300 shadow-inner group-hover:bg-slate-100 dark:group-hover:bg-black/50"
                                />
                            </div>
                            {error && (
                                <p className="mt-3 text-center text-sm font-medium text-red-500 animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Buttons - "Gem" & "Glass" Styles */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Cancel: Frosted Glass */}
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                                           text-slate-600 dark:text-slate-300 
                                           bg-white/50 dark:bg-white/5 
                                           hover:bg-white/80 dark:hover:bg-white/10 
                                           border border-slate-200/60 dark:border-white/10 
                                           shadow-sm hover:shadow-md backdrop-blur-sm
                                           transition-all duration-200 active:scale-[0.98] 
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>

                            {/* Add: Aurora Gem */}
                            <button
                                type="submit"
                                disabled={loading || !unitTitle.trim()}
                                className="relative inline-flex justify-center rounded-full px-4 py-3.5 text-sm font-bold 
                                           text-white 
                                           bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500
                                           hover:from-blue-500 hover:via-cyan-500 hover:to-teal-400
                                           shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 
                                           border border-white/20 
                                           transition-all duration-300 active:scale-[0.98] 
                                           disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
                            >
                                {/* Shine effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none"></div>
                                
                                {loading ? (
                                    <span className="flex items-center gap-2 relative z-10">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Adding...
                                    </span>
                                ) : (
                                    <span className="relative z-10">Add Unit</span>
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}