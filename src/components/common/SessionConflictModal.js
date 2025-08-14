import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'; // Keeping outline for subtle elegance
import { Button } from '@tremor/react';

/**
 * A modal component to warn the user about a session conflict (multi-device login),
 * designed with a more futuristic, highly refined, and light UI.
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
                {/* Backdrop - Enhanced with a lighter, subtle blur and transparent overlay */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-100 bg-opacity-70 transition-opacity backdrop-blur-md" />
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
                            <DialogPanel className="relative transform overflow-hidden rounded-3xl bg-gradient-to-br from-white to-gray-50 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md p-7 sm:p-10 border border-gray-200 backdrop-blur-md">
                                {/* Inner Glow/Border Effect - Adjusted for light background */}
                                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                                    boxShadow: 'inset 0 0 20px rgba(100, 100, 255, 0.05), 0 0 30px rgba(255, 100, 100, 0.03)'
                                }}></div>

                                <div className="flex flex-col items-center">
                                    {/* Icon with Vibrant Background - Adjusted for light modal */}
                                    <div className="relative mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-700 sm:h-14 sm:w-14 shadow-lg mb-6">
                                        <ExclamationCircleIcon className="h-9 w-9 text-white opacity-90" aria-hidden="true" />
                                        {/* Subtle radial gradient pulse behind icon */}
                                        <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-pulse-light" style={{ animationDuration: '2s' }}></div>
                                    </div>

                                    <div className="mt-4 text-center">
                                        <DialogTitle as="h3" className="text-2xl font-extrabold leading-tight text-gray-900 tracking-wide">
                                            Access Denied: Session Conflict
                                        </DialogTitle>
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-700 leading-relaxed">
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
                                        className="inline-flex w-full justify-center rounded-xl border border-transparent bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 text-base font-bold text-white shadow-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] group"
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
