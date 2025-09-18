import React from 'react';
import { Dialog } from '@headlessui/react';

const PresentationFormatChoiceModal = ({ isOpen, onClose, onFormatChosen }) => {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[120]">
            <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6">
                    <Dialog.Title className="font-bold text-lg">Choose Presentation Format</Dialog.Title>
                    <p className="text-sm text-gray-500 mt-2">Select how you want to generate and use your presentation.</p>
                    <div className="mt-4 space-y-2">
                        <button onClick={() => onFormatChosen('google')} className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border">
                            <h3 className="font-semibold">Google Slides</h3>
                            <p className="text-xs text-gray-600">Opens in a new tab. Not saved in the LMS.</p>
                        </button>
                        <button onClick={() => onFormatChosen('reveal')} className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border">
                            <h3 className="font-semibold">Integrated Slides (Reveal.js)</h3>
                            <p className="text-xs text-gray-600">Saves as a new lesson. Viewable within the LMS.</p>
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default PresentationFormatChoiceModal;

