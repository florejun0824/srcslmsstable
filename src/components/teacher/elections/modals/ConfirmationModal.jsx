import React from 'react';
import { motion } from 'framer-motion';
import { Warning, Lightning, Trophy } from '@phosphor-icons/react';

const ConfirmationModal = ({ isOpen, onClose, type, title, message, actionLabel, isDestructive, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto ${isDestructive ? 'bg-red-50 text-red-500' : type === 'countdown' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                    {isDestructive ? <Warning weight="fill" className="w-7 h-7" /> : type === 'countdown' ? <Lightning weight="fill" className="w-7 h-7" /> : <Trophy weight="fill" className="w-7 h-7" />}
                </div>
                <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-center text-slate-500 mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${isDestructive ? 'bg-red-500 shadow-red-500/20' : type === 'countdown' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-green-500 shadow-green-500/20'}`}>
                        {actionLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmationModal;