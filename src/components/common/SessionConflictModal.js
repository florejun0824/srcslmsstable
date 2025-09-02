import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@tremor/react';

/**
 * A modal component to warn the user about a session conflict (multi-device login),
 * redesigned with a clean, translucent, and modern iOS 18-inspired UI.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {string} props.message - The message to display inside the modal.
 * @param {function} props.onClose - Function to call when the modal is closed (e.g., acknowledged).
 */
const SessionConflictModal = ({ isOpen, message, onClose }) => {
    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[9999] font-sans" onClose={onClose}>
                {/* Backdrop - iOS-style frosted glass effect */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl transition-opacity" />
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
                            <DialogPanel className="relative transform overflow-hidden rounded-[28px] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-3xl shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md p-7 sm:p-10 border border-gray-200/50 dark:border-zinc-700/50">
                                
                                <div className="flex flex-col items-center">
                                    {/* Icon with a subtle, tinted background */}
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-6">
                                        <ExclamationCircleIcon className="h-9 w-9 text-red-500" aria-hidden="true" />
                                    </div>

                                    <div className="mt-4 text-center">
                                        <DialogTitle as="h3" className="text-2xl font-semibold leading-tight text-zinc-900 dark:text-white tracking-wide">
                                            Access Denied: Session Conflict
                                        </DialogTitle>
                                        <div className="mt-4">
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                {message || "It appears your account has been accessed from another unauthorized device or location."}
                                                <br />
                                                For security purposes, this session has been terminated. Please log in again to regain access.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <Button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full justify-center rounded-2xl border border-transparent bg-blue-500/90 px-5 py-3 text-base font-medium text-white shadow-md transition-colors duration-200 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                                    >
                                        Acknowledge & Re-login
                                    </Button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default SessionConflictModal;
