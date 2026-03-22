import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PresentationChartBarIcon } from '@heroicons/react/24/solid';
import { ArrowTopRightOnSquareIcon, BookOpenIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const PresentationFormatChoiceModal = ({ isOpen, onClose, onFormatChosen }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-90 translate-y-6"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-90 translate-y-6"
                    >
                        <Dialog.Panel className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            
                            {/* Gradient header bar */}
                            <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                            
                            {/* Header */}
                            <div className="px-7 pt-7 pb-1 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                                            <SparklesIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <Dialog.Title className="font-black text-xl text-slate-900 dark:text-white tracking-tight">
                                            Export Format
                                        </Dialog.Title>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Choose where to generate your presentation.
                                    </p>
                                </div>
                                <button 
                                    onClick={onClose} 
                                    className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -mt-1"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Options */}
                            <div className="px-7 py-6 space-y-3">
                                <motion.button 
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onFormatChosen('google')} 
                                    className="w-full text-left p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-2 border-indigo-100 dark:border-indigo-800/50 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group flex items-center gap-4"
                                >
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-indigo-100 dark:border-indigo-800 group-hover:shadow-indigo-200 dark:group-hover:shadow-none transition-shadow shrink-0">
                                        <PresentationChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Google Slides</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Opens in browser · Uses your template</p>
                                    </div>
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-indigo-300 dark:text-indigo-700 group-hover:text-indigo-500 transition-colors shrink-0" />
                                </motion.button>

                                <motion.button 
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onFormatChosen('reveal')} 
                                    className="w-full text-left p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-2 border-violet-100 dark:border-violet-800/50 hover:border-violet-400 dark:hover:border-violet-600 transition-all group flex items-center gap-4"
                                >
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-violet-100 dark:border-violet-800 group-hover:shadow-violet-200 dark:group-hover:shadow-none transition-shadow shrink-0">
                                        <BookOpenIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Integrated Slides</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Saves as lesson · Reveal.js powered</p>
                                    </div>
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-violet-300 dark:text-violet-700 group-hover:text-violet-500 transition-colors shrink-0" />
                                </motion.button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default PresentationFormatChoiceModal;
