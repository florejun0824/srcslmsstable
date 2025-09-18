// src/components/teacher/BetaWarningModal.js

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { SparklesIcon } from '@heroicons/react/24/outline'; // Using a more appropriate icon for AI features

export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    const [neverShowAgain, setNeverShowAgain] = useState(false);

    if (!isOpen) return null;

    // This handler now passes the checkbox state back to the parent component.
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(neverShowAgain);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />
            
            {/* Revamped Panel with modern styling and animations */}
            <Dialog.Panel className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg mb-4">
                        <SparklesIcon className="h-8 w-8" aria-hidden="true" />
                    </div>
                    
                    <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900">
                        {title || 'Beta Feature Warning'}
                    </Dialog.Title>
                    
                    <div className="mt-4">
                        <p className="text-md text-gray-600">
                            You're using an AI-powered feature that's still in its Beta phase.
                        </p>
                        <p className="mt-2 text-md text-gray-600">
                            While the AI is quite capable, please be sure to review all generated content for accuracy before use.
                        </p>
                    </div>
                </div>

                {/* "Don't show again" checkbox */}
                <div className="mt-6 flex items-center justify-center">
                    <input
                        id="never-show-again"
                        name="never-show-again"
                        type="checkbox"
                        checked={neverShowAgain}
                        onChange={(e) => setNeverShowAgain(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="never-show-again" className="ml-2 block text-sm text-gray-700 select-none">
                        Understood, don't show this message again.
                    </label>
                </div>

                {/* Revamped action buttons */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="w-full inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                    >
                        Agree & Continue
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}