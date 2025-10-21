import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import React, { Fragment } from 'react';

/**
 * A modal component to inform the user about a session conflict, styled with a neumorphic design.
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
                {/* Neumorphic Design Changes: Removed backdrop-blur for a clean overlay */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 transition-opacity" />
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
                            {/* Neumorphic Design Changes: Replaced glassmorphism with neumorphic styles */}
                            <DialogPanel className="relative transform overflow-hidden rounded-3xl bg-neumorphic-base text-center shadow-neumorphic transition-all sm:w-full sm:max-w-sm">
                                <div className="p-6">
                                    {/* Neumorphic Design Changes: Icon container is now "pressed in" with an inset shadow */}
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neumorphic-base shadow-neumorphic-inset">
                                        <ExclamationCircleIcon className="h-10 w-10 text-primary-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4">
                                        <DialogTitle as="h3" className="text-lg font-bold text-slate-800">
                                            Session Conflict
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-600">
                                                {message}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Neumorphic Design Changes: Button is now a distinct, extruded element */}
                                <div className="p-4 pt-0">
                                    <button
                                        type="button"
                                        className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-primary-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-primary-600"
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