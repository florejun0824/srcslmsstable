import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/20/solid';

// Helper function to format the notes object into a readable string
const formatNotesToString = (notesObject) => {
    if (!notesObject || typeof notesObject !== 'object') {
        return "No speaker notes available.";
    }

    const { talkingPoints, interactiveElement, slideTiming } = notesObject;

    let formattedString = `[TALKING POINTS]\n${talkingPoints || 'N/A'}\n\n`;
    formattedString += `[INTERACTIVE ELEMENT]\n${interactiveElement || 'N/A'}\n\n`;
    formattedString += `[SUGGESTED TIMING: ${slideTiming || 'N/A'}]`;

    return formattedString;
};

export default function PresentationPreviewModal({ isOpen, onClose, previewData, onConfirm, isSaving }) {
    // --- ADDED: Local state to track completion ---
    const [isCreationComplete, setIsCreationComplete] = useState(false);
    const prevIsSaving = useRef(isSaving);

    // --- ADDED: Effect to reset on open ---
    useEffect(() => {
        if (isOpen) {
            // When modal opens, reset the "complete" state
            setIsCreationComplete(false);
            prevIsSaving.current = isSaving; // Sync ref
        }
    }, [isOpen, isSaving]);

    // --- ADDED: Effect to detect when saving finishes ---
    useEffect(() => {
        // Check if isSaving just changed from TRUE to FALSE
        if (prevIsSaving.current === true && isSaving === false) {
            // This means the save operation just finished.
            // We assume it was successful because the parent didn't close the modal.
            setIsCreationComplete(true);
        }
        // Update the ref for the next render
        prevIsSaving.current = isSaving;
    }, [isSaving]);

    if (!isOpen) return null;

    const slides = previewData?.slides || [];

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[9999] font-sans" onClose={onClose}>
                {/* Backdrop */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    {/* --- MODIFIED: Added dark theme backdrop --- */}
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity dark:bg-black/80" />
                </TransitionChild>

                <div className="fixed inset-0 z-[9999] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            {/* Neumorphic Modal Panel */}
                            {/* --- MODIFIED: Added dark theme panel styles --- */}
                            <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-neumorphic-base shadow-neumorphic transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-7
                                                     dark:bg-neumorphic-base-dark dark:shadow-lg">
                                
                                {/* Header */}
                                {/* --- MODIFIED: Added dark theme border --- */}
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-neumorphic-shadow-dark/20 dark:border-slate-700">
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <Dialog.Title className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                        Presentation Preview ({slides.length} Slides)
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        // --- MODIFIED: Added dark theme button styles ---
                                        className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition
                                                   dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                                    >
                                        {/* --- MODIFIED: Added dark theme icon --- */}
                                        <XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                    </button>
                                </div>

                                {/* Slides Content */}
                                <div className="flex-grow overflow-y-auto pr-3 space-y-6">
                                    {slides.length > 0 ? (
                                        slides.map((slide, index) => (
                                            <div
                                                key={index}
                                                // --- MODIFIED: Added dark theme card styles ---
                                                className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic text-left
                                                           dark:bg-neumorphic-base-dark dark:shadow-lg"
                                            >
                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">SLIDE {index + 1}</p>
                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">{slide.title}</h3>
                                                
                                                {/* --- MODIFIED: Added dark theme inset styles --- */}
                                                <div className="text-sm text-slate-700 bg-neumorphic-base shadow-neumorphic-inset p-3 rounded-xl mb-4
                                                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-200">
                                                    <pre className="whitespace-pre-wrap font-sans">{slide.body}</pre>
                                                </div>

                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <h4 className="font-semibold text-xs text-slate-500 dark:text-slate-400 mt-4 mb-2">SPEAKER NOTES</h4>
                                                {/* --- MODIFIED: Added dark theme inset styles --- */}
                                                <div className="text-xs text-slate-700 bg-neumorphic-base shadow-neumorphic-inset p-3 rounded-xl
                                                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-300">
                                                    <pre className="whitespace-pre-wrap font-sans">{formatNotesToString(slide.notes)}</pre>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        // --- MODIFIED: Added dark theme text ---
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-10">No slide data to display.</p>
                                    )}
                                </div>

                                {/* --- MODIFIED: Footer Buttons logic --- */}
                                <div className="pt-6 mt-6 border-t border-neumorphic-shadow-dark/20 dark:border-slate-700 flex justify-end">
                                    {isCreationComplete ? (
                                        // --- ADDED: "Close" button for after creation ---
                                        <button
                                            onClick={onClose}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-100 bg-gradient-to-br from-slate-500 to-slate-600 shadow-neumorphic hover:shadow-neumorphic-inset transition active:scale-[0.98]
                                                       dark:from-slate-600 dark:to-slate-700 dark:text-slate-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                            Close
                                        </button>
                                    ) : (
                                        // --- MODIFIED: "Create" button with glow effect ---
                                        <button
                                            onClick={onConfirm}
                                            disabled={isSaving}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 shadow-neumorphic hover:shadow-neumorphic-inset transition duration-150 disabled:opacity-50
                                                       dark:from-sky-700 dark:to-blue-800 dark:text-sky-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark
                                                       active:scale-[0.98] active:shadow-[0_0_15px_3px_rgba(56,189,248,0.6)] dark:active:shadow-[0_0_15px_3px_rgba(56,189,248,0.6)]"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                    Create Presentation
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                {/* --- END: MODIFIED Footer Buttons --- */}
                            </Dialog.Panel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}