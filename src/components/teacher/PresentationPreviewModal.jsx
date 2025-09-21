import React from 'react';
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
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-neumorphic-base shadow-neumorphic transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-7">
                                
                                {/* Header */}
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-neumorphic-shadow-dark/20">
                                    <Dialog.Title className="text-2xl font-bold text-slate-800">
                                        Presentation Preview ({slides.length} Slides)
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition"
                                    >
                                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                                    </button>
                                </div>

                                {/* Slides Content */}
                                <div className="flex-grow overflow-y-auto pr-3 space-y-6">
                                    {slides.length > 0 ? (
                                        slides.map((slide, index) => (
                                            <div
                                                key={index}
                                                className="bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic text-left"
                                            >
                                                <p className="text-xs font-semibold text-slate-400 mb-2">SLIDE {index + 1}</p>
                                                <h3 className="text-lg font-bold text-slate-800 mb-3">{slide.title}</h3>
                                                
                                                <div className="text-sm text-slate-700 bg-neumorphic-base shadow-neumorphic-inset p-3 rounded-xl mb-4">
                                                    <pre className="whitespace-pre-wrap font-sans">{slide.body}</pre>
                                                </div>

                                                <h4 className="font-semibold text-xs text-slate-500 mt-4 mb-2">SPEAKER NOTES</h4>
                                                <div className="text-xs text-slate-700 bg-neumorphic-base shadow-neumorphic-inset p-3 rounded-xl">
                                                    <pre className="whitespace-pre-wrap font-sans">{formatNotesToString(slide.notes)}</pre>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-500 py-10">No slide data to display.</p>
                                    )}
                                </div>

                                {/* Footer Buttons */}
                                <div className="pt-6 mt-6 border-t border-neumorphic-shadow-dark/20 flex justify-end">
                                    <button
                                        onClick={onConfirm}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 shadow-neumorphic hover:shadow-neumorphic-inset transition disabled:opacity-50"
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
