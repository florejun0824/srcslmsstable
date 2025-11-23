import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

/**
 * A modal component to inform the user about a session conflict, styled with MacOS 26 design.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {string} props.message - The message to display to the user.
 * @param {function} props.onClose - Function to call when the user acknowledges the message.
 */
export default function SessionConflictModal({ isOpen, message, onClose }) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[1000] font-sans" onClose={onClose}>
                {/* Backdrop */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-[1000] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            {/* Glass Panel */}
                            <DialogPanel className="relative transform overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-[#18181b]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 text-center shadow-2xl transition-all sm:w-full sm:max-w-sm p-8">
                                <div className="flex flex-col items-center">
                                    {/* Icon Container */}
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-500 mb-6 relative">
                                        <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 rounded-full"></div>
                                        <ExclamationCircleIcon className="h-10 w-10 relative z-10" aria-hidden="true" strokeWidth={1.5} />
                                    </div>
                                    
                                    <DialogTitle as="h3" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        Session Conflict
                                    </DialogTitle>
                                    
                                    <div className="mt-3 mb-8">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {message}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all"
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