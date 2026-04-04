import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Printer, X } from '@phosphor-icons/react';

const TiedInfoModal = ({ isOpen, onClose, election, onViewSummary }) => {
    if (!isOpen || !election) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Decorative Background Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                        
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X size={20} weight="bold" />
                        </button>

                        {/* Icon Header */}
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center mb-6 shadow-sm">
                            <Info weight="fill" className="w-8 h-8 text-amber-500" />
                        </div>

                        {/* Content */}
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            Round 1 Result (Tied)
                        </h3>
                        
                        <div className="space-y-4 mb-8">
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                                This election resulted in a tie in one or more positions. While the parent card is paused, the voting record is preserved here for transparency.
                            </p>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">How to proceed</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-normal">
                                    To see the final winners, please locate and view the active <span className="text-amber-500">Tie-Breaker card</span> in your dashboard.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    onViewSummary();
                                    onClose();
                                }}
                                className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Printer weight="fill" size={18} />
                                View Round 1 Report
                            </button>
                            
                            <button
                                onClick={onClose}
                                className="w-full py-3 text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default TiedInfoModal;
