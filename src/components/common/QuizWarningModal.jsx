import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * A modal component to warn the student about closing a quiz prematurely, styled like a modern iOS alert.
 * It tracks warnings and informs the student about the consequences.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {number} props.warnings - The current number of warnings accumulated.
 * @param {number} props.maxWarnings - The maximum number of warnings allowed before lockout.
 * @param {function} props.onStay - Function to call if the student chooses to stay in the quiz.
 * @param {function} props.onLeave - Function to call if the student chooses to leave (and incur a warning).
 * @param {boolean} [props.isLocked=false] - If the quiz is already locked due to warnings.
 */
const QuizWarningModal = ({ isOpen, warnings, maxWarnings, onStay, onLeave, isLocked = false }) => {
    // Logic for messages and titles remains unchanged.
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
                {/* Backdrop with increased blur */}
                <TransitionChild
                    as={React.Fragment}
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
                            as={React.Fragment}
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
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                                        <ExclamationTriangleIcon className="h-10 w-10 text-red-500" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4">
                                        <DialogTitle as="h3" className="text-lg font-bold text-gray-900">
                                            {getTitle()}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-700">
                                                {getMessage()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* iOS-style button container with top border */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-gray-500/20">
                                    {!isLocked ? (
                                        <>
                                            {/* Stay Button (Cancel Action) */}
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                className="w-full py-3 text-center text-sm font-medium text-blue-600 hover:bg-gray-500/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-200/60 rounded-bl-2xl"
                                            >
                                                Stay in Quiz
                                            </button>
                                            {/* Leave Button (Destructive Action) */}
                                            <button
                                                type="button"
                                                onClick={onLeave}
                                                className="w-full py-3 text-center text-sm font-semibold text-red-600 hover:bg-gray-500/10 transition-colors duration-200 sm:border-l border-gray-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-200/60 rounded-br-2xl"
                                            >
                                                Leave & Get Warning
                                            </button>
                                        </>
                                    ) : (
                                        // Acknowledge Button for locked state
                                        <div className="sm:col-span-2">
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                className="w-full py-3 text-center text-sm font-medium text-blue-600 hover:bg-gray-500/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-200/60 rounded-b-2xl"
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