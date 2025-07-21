// In src/components/teacher/BetaWarningModal.js

import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, BeakerIcon } from '@heroicons/react/24/outline';

export default function BetaWarningModal({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                        <BeakerIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                    </div>
                    <div className="mt-0 text-left flex-1">
                        <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                            AI Presentation Generator (Beta)
                        </Dialog.Title>
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">
                                This feature is currently in its Beta stage. The AI is constantly learning, but it may sometimes produce unexpected or inaccurate content.
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                                Would you like to proceed?
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        type="button"
                        className="btn-secondary w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-primary w-full sm:w-auto"
                        onClick={handleConfirm}
                    >
                        Agree & Continue
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}