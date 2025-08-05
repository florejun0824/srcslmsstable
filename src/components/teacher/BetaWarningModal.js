// In src/components/teacher/BetaWarningModal.js

import React from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // Changed to a warning icon

// ✅ MODIFIED: Added 'title' prop for reusability
export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose(); // The modal will close itself after confirming
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                    </div>
                    <div className="mt-0 text-left flex-1">
                        {/* ✅ MODIFIED: Title is now dynamic with a fallback */}
                        <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                            {title || 'Beta Feature'}
                        </Dialog.Title>
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">
                                This feature is currently in its Beta stage. The AI is constantly learning, but it may sometimes produce unexpected or inaccurate content.
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                                Please review all generated content carefully before use.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 py-2 px-4 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 w-full sm:w-auto mt-2 sm:mt-0"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="bg-amber-500 py-2 px-4 rounded-lg text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 w-full sm:w-auto"
                    >
                        Agree & Continue
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}