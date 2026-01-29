// src/components/common/ConfirmActionModal.jsx
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { WarningCircle, Info, Trash, Archive } from '@phosphor-icons/react';

export const ConfirmActionModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Confirm", 
    variant = "danger" 
}) => {
    const variants = {
        danger: {
            icon: <Trash weight="fill" className="text-red-500" />,
            button: "bg-red-600 hover:bg-red-700 shadow-red-500/20",
            bg: "bg-red-50 dark:bg-red-500/10"
        },
        warning: {
            icon: <WarningCircle weight="fill" className="text-amber-500" />,
            button: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
            bg: "bg-amber-50 dark:bg-amber-500/10"
        },
        info: {
            icon: <Info weight="fill" className="text-blue-500" />,
            button: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
            bg: "bg-blue-50 dark:bg-blue-500/10"
        }
    };

    const style = variants[variant] || variants.danger;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#121214] p-8 text-left align-middle shadow-2xl transition-all border border-white/10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`p-3 rounded-2xl ${style.bg}`}>
                                        {style.icon}
                                    </div>
                                    <Dialog.Title as="h3" className="text-xl font-bold text-slate-900 dark:text-white">
                                        {title}
                                    </Dialog.Title>
                                </div>

                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                                    {message}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { onConfirm(); onClose(); }}
                                        className={`flex-1 px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-transform active:scale-95 ${style.button}`}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};