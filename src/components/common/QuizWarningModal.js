import React from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Button } from '@tremor/react';

/**
 * A modal component to warn the student about closing a quiz prematurely.
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
    // Determine the message based on warnings and lock status
    const getMessage = () => {
        if (isLocked) {
            return "This quiz is now locked due to too many unauthorized attempts to navigate away. Please contact your teacher.";
        } else if (warnings < maxWarnings) {
            const remainingWarnings = maxWarnings - warnings;
            return `Navigating away or closing the quiz is not allowed. This is Warning ${warnings + 1} of ${maxWarnings}. If you leave now, you will receive a warning. You have ${remainingWarnings - 1} warning(s) left before the quiz locks.`;
        }
        return "You have reached the maximum number of warnings. This quiz will now be locked.";
    };

    const getTitle = () => {
        if (isLocked) return "Quiz Permanently Locked";
        return `Unauthorized Action: Warning ${warnings + 1}`;
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[1000] font-sans" onClose={isLocked ? onStay : onStay}> {/* If locked, force stay */}
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
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 z-[1000] w-screen overflow-y-auto">
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
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md p-6 sm:p-8 border border-red-200">
                                <div className="flex flex-col items-center">
                                    <div className="mx-auto flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:h-12 sm:w-12">
                                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4 text-center">
                                        <DialogTitle as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                            {getTitle()}
                                        </DialogTitle>
                                        <div className="mt-3">
                                            <p className="text-sm text-gray-600">
                                                {getMessage()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 sm:flex sm:flex-row-reverse">
                                    {!isLocked ? (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={onLeave}
                                                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                                            >
                                                Leave Quiz & Get Warning
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={onStay}
                                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                            >
                                                Stay in Quiz
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={onStay} // Only option is to acknowledge and effectively close
                                            className="inline-flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 sm:w-auto"
                                        >
                                            Acknowledge
                                        </Button>
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