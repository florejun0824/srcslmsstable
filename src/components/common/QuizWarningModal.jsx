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
                {/* Neumorphic Design Changes: Removed backdrop-blur for a clean overlay */}
                <TransitionChild
                    as={React.Fragment}
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
                            as={React.Fragment}
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
                                        <ExclamationTriangleIcon className="h-10 w-10 text-red-500" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4">
                                        <DialogTitle as="h3" className="text-lg font-bold text-slate-800">
                                            {getTitle()}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-600">
                                                {getMessage()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Neumorphic Design Changes: Buttons are now distinct, extruded elements */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 pt-0">
                                    {!isLocked ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-slate-900"
                                            >
                                                Stay in Quiz
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onLeave}
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-red-600 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-red-700"
                                            >
                                                Leave & Get Warning
                                            </button>
                                        </>
                                    ) : (
                                        <div className="sm:col-span-2">
                                            <button
                                                type="button"
                                                onClick={onStay}
                                                className="w-full py-3 text-center text-sm font-semibold bg-neumorphic-base text-primary-700 rounded-xl shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:text-primary-600"
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