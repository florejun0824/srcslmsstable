// src/components/teacher/BetaWarningModal.js

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function BetaWarningModal({ isOpen, onClose, onConfirm, title }) {
    const [neverShowAgain, setNeverShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(neverShowAgain);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            {/* --- MODIFIED: Added dark theme backdrop --- */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />

            {/* Neumorphic Panel */}
            {/* --- MODIFIED: Added dark theme panel styles --- */}
            <Dialog.Panel className="relative bg-neumorphic-base dark:bg-neumorphic-base-dark p-8 rounded-3xl shadow-neumorphic dark:shadow-lg w-full max-w-md transform transition-all duration-300 ease-in-out">
                <div className="text-center">
                    {/* Icon */}
                    {/* --- MODIFIED: Added dark theme icon container styles --- */}
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-amber-500 dark:text-amber-400 mb-6">
                        <SparklesIcon className="h-8 w-8" aria-hidden="true" />
                    </div>

                    {/* Title */}
                    <Dialog.Title
                        as="h3"
                        // --- MODIFIED: Added dark theme text ---
                        className="text-2xl font-bold leading-6 text-slate-800 dark:text-slate-100"
                    >
                        {title || 'Beta Feature Warning'}
                    </Dialog.Title>

                    {/* Message */}
                    <div className="mt-4 space-y-2">
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-md text-slate-600 dark:text-slate-400">
                            You're using an AI-powered feature that's still in its Beta phase.
                        </p>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-md text-slate-600 dark:text-slate-400">
                            Please review all generated content carefully before use.
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
                        // --- MODIFIED: Added dark theme checkbox styles ---
                        className="h-4 w-4 rounded bg-neumorphic-base shadow-neumorphic-inset border-none focus:ring-0 cursor-pointer
                                   dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:focus:ring-offset-0"
                    />
                    <label
                        htmlFor="never-show-again"
                        // --- MODIFIED: Added dark theme text ---
                        className="ml-2 block text-sm text-slate-700 dark:text-slate-300 select-none cursor-pointer"
                    >
                        Understood, don't show this again
                    </label>
                </div>

                {/* Action buttons */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        // --- MODIFIED: Added dark theme button styles ---
                        className="px-5 py-3 rounded-xl bg-neumorphic-base shadow-neumorphic text-slate-700 font-semibold hover:shadow-neumorphic-inset transition
                                   dark:bg-neumorphic-base-dark dark:shadow-lg dark:text-slate-300 dark:hover:shadow-neumorphic-inset-dark"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        // --- MODIFIED: Added dark theme button styles ---
                        className="px-5 py-3 rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 font-semibold shadow-neumorphic hover:shadow-neumorphic-inset transition
                                   dark:from-sky-700 dark:to-blue-800 dark:text-sky-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                    >
                        Agree & Continue
                    </button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}