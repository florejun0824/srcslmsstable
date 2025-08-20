import React from 'react';
import { Dialog } from '@headlessui/react';
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
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

            <Dialog.Panel className="relative bg-slate-100 p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-300">
                    <Dialog.Title className="text-xl font-bold text-slate-800">
                        Presentation Preview ({slides.length} Slides)
                    </Dialog.Title>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto -mr-3 pr-3 space-y-6">
                    {slides.length > 0 ? (
                        slides.map((slide, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow border border-slate-200">
                                <p className="text-xs font-semibold text-slate-400 mb-2">SLIDE {index + 1}</p>
                                <h3 className="font-bold text-slate-800 mb-2">{slide.title}</h3>
                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                    <pre className="whitespace-pre-wrap font-sans">{slide.body}</pre>
                                </div>
                                <h4 className="font-bold text-xs text-slate-500 mt-4 mb-2">SPEAKER NOTES</h4>
                                <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded border border-amber-200">
                                    {/* ✅ FIXED: Apply the formatting function here */}
                                    <pre className="whitespace-pre-wrap font-sans">{formatNotesToString(slide.notes)}</pre>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-10">No slide data to display.</p>
                    )}
                </div>

                <div className="pt-6 mt-4 border-t border-slate-300 flex justify-end">
                    <button
                        onClick={onConfirm}
                        disabled={isSaving}
                        className="btn-primary inline-flex items-center gap-2"
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
        </Dialog>
    );
}