import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

/**
 * A modal component to inform the user about a session conflict (e.g., logged in elsewhere).
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {string} props.message - The message to display to the user.
 * @param {function} props.onClose - Function to call when the user acknowledges the message (e.g., logout).
 */
export default function SessionConflictModal({ isOpen, message, onClose }) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[1000] font-sans" onClose={onClose}>
                {/* Backdrop with iOS-style blur */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 transition-opacity backdrop-blur-md" />
                </TransitionChild>

                <div className="fixed inset-0 z-[1000] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            {/* Translucent, blurred dialog panel */}
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-gray-200/60 backdrop-blur-xl text-center shadow-lg transition-all sm:w-full sm:max-w-sm border border-white/20">
                                <div className="p-6">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                                        <ExclamationCircleIcon className="h-10 w-10 text-blue-500" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4">
                                        <DialogTitle as="h3" className="text-lg font-bold text-gray-900">
                                            Session Conflict
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-700">
                                                {message}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* iOS-style button container with top border */}
                                <div className="border-t border-gray-500/20">
                                    <button
                                        type="button"
                                        className="w-full py-3 text-center text-sm font-semibold text-blue-600 hover:bg-gray-500/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-200/60 rounded-b-2xl"
                                        onClick={onClose}
                                    >
                                        Acknowledge & Logout
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}