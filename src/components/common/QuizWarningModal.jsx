import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const QuizWarningModal = ({ isOpen, warnings, maxWarnings, onStay, onLeave, isLocked = false }) => {
    const getMessage = () => {
        if (isLocked) {
            return "This quiz is now locked. Please contact your teacher to have it unlocked.";
        }
        const nextWarningNum = warnings + 1;
        const remainingWarnings = maxWarnings - nextWarningNum;

        if (remainingWarnings > 0) {
            return `This is Warning ${nextWarningNum} of ${maxWarnings}. You have ${remainingWarnings} warning(s) left before the quiz locks. Are you sure you want to leave?`;
        }
        return "This is your final warning. If you leave now, the quiz will be permanently locked.";
    };

    const getTitle = () => {
        if (isLocked) return "Quiz Locked";
        return `Warning ${warnings + 1} of ${maxWarnings}`;
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            {/* --- MODIFIED: Added dark theme to overlay --- */}
            <Dialog as="div" className="relative z-[1000] font-sans" onClose={isLocked ? onStay : onStay}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    {/* --- MODIFIED: Added dark theme to backdrop --- */}
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            {/* --- MODIFIED: Added dark theme to modal panel --- */}
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-neumorphic-base p-6 text-left align-middle shadow-neumorphic transition-all dark:bg-neumorphic-base-dark dark:shadow-lg">
                                
                                <div className="flex flex-col items-center">
                                    {/* --- MODIFIED: Added dark theme to icon wrapper --- */}
                                    <div className="mx-auto inline-block p-3 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                        <ExclamationTriangleIcon className={`h-8 w-8 ${isLocked ? 'text-red-500' : 'text-yellow-500'}`} />
                                    </div>
                                    
                                    {/* --- MODIFIED: Added dark theme to title --- */}
                                    <DialogTitle as="h3" className="text-xl font-extrabold leading-6 text-slate-900 dark:text-slate-100">
                                        {getTitle()}
                                    </DialogTitle>
                                    
                                    {/* --- MODIFIED: Added dark theme to message body --- */}
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            {getMessage()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {!isLocked ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                // --- MODIFIED: Added dark theme styles for onStay ---
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-blue-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                            >
                                                Stay in Quiz
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onLeave}
                                                // --- MODIFIED: Added dark theme styles for onLeave ---
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-red-600 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-red-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                            >
                                                Leave & Get Warning
                                            </button>
                                        </>
                                    ) : (
                                        <div className="sm:col-span-2">
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                // --- MODIFIED: Added dark theme styles for acknowledge button ---
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                                            >
                                                Acknowledge
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default QuizWarningModal;