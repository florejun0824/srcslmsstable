import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon, PresentationChartLineIcon, SpeakerWaveIcon } from '@heroicons/react/20/solid';

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
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [isCreationComplete, setIsCreationComplete] = useState(false);
    const prevIsSaving = useRef(isSaving);

    // Effect to reset on open
    useEffect(() => {
        if (isOpen) {
            setIsCreationComplete(false);
            setSelectedSlideIndex(0);
            prevIsSaving.current = isSaving;
        }
    }, [isOpen, isSaving]);

    // Effect to detect when saving finishes
    useEffect(() => {
        if (prevIsSaving.current && !isSaving && isOpen) {
            setIsCreationComplete(true);
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            return () => clearTimeout(timer);
        }
        prevIsSaving.current = isSaving;
    }, [isSaving, isOpen, onClose]);

    const slides = previewData?.slides || [];
    const selectedSlide = slides[selectedSlideIndex];

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog 
                as="div" 
                className="relative z-[120]" 
                onClose={isSaving ? () => {} : onClose}
            >
                {/* Backdrop: Darker, reduced blur for focus */}
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-[24px] bg-white dark:bg-[#1e1e1e] shadow-2xl ring-1 ring-black/5 transition-all flex flex-col max-h-[90vh]">
                                
                                {/* --- Header --- */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#1e1e1e]/50 backdrop-blur-xl z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                            <PresentationChartLineIcon className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <Dialog.Title as="h3" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                                Generate Slides
                                            </Dialog.Title>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Review content before exporting to Google Slides
                                            </p>
                                        </div>
                                    </div>
                                    {!isSaving && !isCreationComplete && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
                                        >
                                            <XMarkIcon className="h-5 w-5 stroke-[2.5]" />
                                        </button>
                                    )}
                                </div>

                                {/* --- Main Content Area (Split View) --- */}
                                <div className="flex flex-grow overflow-hidden relative">
                                    
                                    {/* Sidebar: Slide List */}
                                    <div className="w-1/3 min-w-[250px] max-w-[320px] border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#1e1e1e] flex flex-col">
                                        <div className="p-3 border-b border-slate-100 dark:border-white/5">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
                                                Slides ({slides.length})
                                            </span>
                                        </div>
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                                            {slides.map((slide, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedSlideIndex(idx)}
                                                    className={`w-full text-left px-3 py-3 rounded-[12px] group transition-all duration-200 border
                                                        ${selectedSlideIndex === idx 
                                                            ? 'bg-white dark:bg-white/10 border-slate-200 dark:border-white/5 shadow-sm' 
                                                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0
                                                            ${selectedSlideIndex === idx ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                                                            {idx + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className={`text-[13px] font-semibold truncate ${selectedSlideIndex === idx ? 'text-slate-900 dark:text-white' : ''}`}>
                                                                {slide.title || `Slide ${idx + 1}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preview Pane */}
                                    <div className="flex-grow bg-slate-100/50 dark:bg-black/20 flex flex-col relative overflow-hidden">
                                        
                                        {/* Canvas Area */}
                                        <div className="flex-grow overflow-y-auto p-8 flex items-center justify-center">
                                            {selectedSlide ? (
                                                <div className="w-full max-w-3xl aspect-video bg-white dark:bg-[#2c2c2e] rounded-xl shadow-2xl shadow-black/10 border border-slate-200/60 dark:border-white/5 flex flex-col overflow-hidden relative group">
                                                    {/* Simulated Slide Content */}
                                                    <div className="flex-grow p-10 md:p-12 flex flex-col justify-center">
                                                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                                            {selectedSlide.title}
                                                        </h1>
                                                        <div className="prose prose-lg prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                            {Array.isArray(selectedSlide.body) 
                                                                ? selectedSlide.body.join('\n') 
                                                                : selectedSlide.body}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Branding / Footer Simulation */}
                                                    <div className="h-2 bg-gradient-to-r from-[#007AFF] to-blue-400 absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ) : (
                                                <p className="text-slate-400">Select a slide to preview</p>
                                            )}
                                        </div>

                                        {/* Speaker Notes Drawer */}
                                        <div className="h-[180px] flex-shrink-0 bg-white dark:bg-[#1e1e1e] border-t border-slate-200 dark:border-white/5 flex flex-col">
                                            <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1e1e1e] flex items-center gap-2">
                                                <SpeakerWaveIcon className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Speaker Notes</span>
                                            </div>
                                            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                                {selectedSlide ? formatNotesToString(selectedSlide.notes) : ''}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* --- Footer Actions --- */}
                                <div className="px-6 py-4 bg-white dark:bg-[#1e1e1e] border-t border-slate-200 dark:border-white/5 flex justify-end items-center gap-3 z-20">
                                    {isCreationComplete ? (
                                        <div className="flex items-center text-green-600 dark:text-green-400 font-bold px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                                            Presentation Created Successfully!
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={isSaving}
                                                className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold text-slate-700 dark:text-slate-300 
                                                         hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent disabled:opacity-50 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onConfirm}
                                                disabled={isSaving}
                                                className={`px-6 py-2.5 rounded-[14px] text-[13px] font-bold text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-[0.98]
                                                    ${isSaving 
                                                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none' 
                                                        : 'bg-[#007AFF] hover:bg-[#0062CC]'
                                                    }`}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                        Creating Presentation...
                                                    </>
                                                ) : (
                                                    <>
                                                        Create in Google Slides
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}