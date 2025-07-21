import React from 'react';
import { Dialog } from '@headlessui/react';
import Spinner from '../common/Spinner';
import { XMarkIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';

const SlidePreviewCard = ({ slide, index }) => (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
        <h4 className="font-bold text-sm text-gray-800">Slide {index + 1}: {slide.title}</h4>
        <div className="mt-2 text-sm text-gray-700 space-y-1">
            {slide.body.split('\\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p> 
            ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200">
            <h5 className="text-xs font-semibold text-gray-500 mb-1">Teacher Notes:</h5>
            <p className="text-xs text-gray-600 italic">
                {slide.notes}
            </p>
        </div>
    </div>
);

export default function PresentationPreviewModal({ isOpen, onClose, previewData, onConfirm, isSaving }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-slate-50 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {isSaving && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-50 rounded-2xl">
                        <Spinner />
                        <p className="mt-2 text-sm text-slate-600">Creating presentation in Google Drive...</p>
                    </div>
                )}
                
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 sm:p-3 rounded-xl text-white shadow-lg flex-shrink-0">
                            <PresentationChartBarIcon className="h-6 w-6 sm:h-8 sm:h-8" />
                        </div>
                        <div>
                            <Dialog.Title className="text-base sm:text-2xl font-bold text-slate-800">Presentation Preview</Dialog.Title>
                            <p className="text-xs sm:text-sm text-slate-500">Review the AI-generated summary before creating the file.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto -mr-2 pr-2 sm:-mr-4 sm:pr-4">
                    {previewData?.slides?.map((slide, index) => (
                        <SlidePreviewCard key={index} slide={slide} index={index} />
                    ))}
                </div>
                 
                <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200 mt-4 sm:mt-6">
                    <button onClick={onClose} disabled={isSaving} className="btn-secondary w-full sm:w-auto text-sm">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="btn-primary w-full sm:w-auto text-sm" disabled={isSaving}>
                        {isSaving ? 'Creating...' : 'Accept & Create Presentation'}
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}