import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/20/solid';

// Helper function to format the notes object into a readable string
const formatNotesToString = (notesObject) => {
    // If for any reason the notes are not a valid object, return a safe fallback.
    if (!notesObject || typeof notesObject !== 'object') {
        return "No speaker notes available.";
    }

    const { talkingPoints, interactiveElement, slideTiming } = notesObject;

    // Build the string from the object's properties
    let formattedString = `[TALKING POINTS]\n${talkingPoints || 'N/A'}\n\n`;
    formattedString += `[INTERACTIVE ELEMENT]\n${interactiveElement || 'N/A'}\n\n`;
    formattedString += `[SUGGESTED TIMING: ${slideTiming || 'N/A'}]`;

    return formattedString;
};


export default function PresentationPreviewModal({ isOpen, onClose, previewData, onConfirm, isSaving }) {
    if (!isOpen) {
        return null;
    }

    const slides = previewData?.slides || [];

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[9999] font-sans" onClose={onClose}>
                {/* Backdrop - iOS-style frosted glass effect */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl transition-opacity" />
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-[28px] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-3xl shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-7">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200/50 dark:border-zinc-700/50">
                                    <Dialog.Title className="text-xl font-semibold text-zinc-800 dark:text-white">
                                        Presentation Preview ({slides.length} Slides)
                                    </Dialog.Title>
                                    <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-grow overflow-y-auto -mr-3 pr-3 space-y-6">
                                    {slides.length > 0 ? (
                                        slides.map((slide, index) => (
                                            <div key={index} className="bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl shadow-sm border border-gray-200/50 dark:border-zinc-700/50">
                                                <p className="text-xs font-medium text-zinc-400 mb-2">SLIDE {index + 1}</p>
                                                <h3 className="font-semibold text-zinc-800 dark:text-white mb-2">{slide.title}</h3>
                                                <div className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                                                    <pre className="whitespace-pre-wrap font-sans">{slide.body}</pre>
                                                </div>
                                                <h4 className="font-semibold text-xs text-zinc-500 dark:text-zinc-500 mt-4 mb-2">SPEAKER NOTES</h4>
                                                <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-sky-50/70 dark:bg-sky-900/50 p-3 rounded-lg border border-sky-200/70 dark:border-sky-800/70">
                                                    <pre className="whitespace-pre-wrap font-sans">{formatNotesToString(slide.notes)}</pre>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-zinc-500 py-10">No slide data to display.</p>
                                    )}
                                </div>

                                <div className="pt-6 mt-4 border-t border-gray-200/50 dark:border-zinc-700/50 flex justify-end">
                                    <button
                                        onClick={onConfirm}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-transparent bg-blue-500/90 px-5 py-3 text-base font-medium text-white shadow-md transition-colors duration-200 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
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
                                </div>
                            </Dialog.Panel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
