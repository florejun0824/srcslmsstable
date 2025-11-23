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
            <Dialog as="div" className="relative z-[1000] font-sans" onClose={isLocked ? onStay : onStay}>
                {/* Backdrop */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            {/* Glass Panel */}
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-[#18181b]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 text-left align-middle shadow-2xl transition-all">
                                
                                <div className="flex flex-col items-center text-center">
                                    {/* Icon with Glow */}
                                    <div className={`relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${isLocked ? 'bg-red-100 dark:bg-red-900/20 text-red-500' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-500'}`}>
                                        <div className={`absolute inset-0 rounded-full blur-xl opacity-40 ${isLocked ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                        <ExclamationTriangleIcon className="h-10 w-10 relative z-10" strokeWidth={1.5} />
                                    </div>
                                    
                                    <DialogTitle as="h3" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        {getTitle()}
                                    </DialogTitle>
                                    
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {getMessage()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-1 gap-3">
                                    {!isLocked ? (
                                        <>
                                            {/* Primary Action (Stay) */}
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]"
                                            >
                                                Stay in Quiz
                                            </button>
                                            
                                            {/* Secondary Action (Leave) */}
                                            <button
                                                type="button"
                                                onClick={onLeave}
                                                className="w-full py-3.5 rounded-2xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
                                            >
                                                Leave & Get Warning
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onStay}
                                            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg transition-all active:scale-[0.98]"
                                        >
                                            Acknowledge
                                        </button>
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