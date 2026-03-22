import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Warning, Lightning, Trophy } from '@phosphor-icons/react';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    type, 
    title, 
    message, 
    actionLabel, 
    isDestructive, 
    onConfirm,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const iconBg = isDestructive
        ? 'bg-red-50 dark:bg-red-500/10'
        : type === 'countdown'
            ? 'bg-amber-50 dark:bg-amber-500/10'
            : 'bg-emerald-50 dark:bg-emerald-500/10';

    const iconColor = isDestructive
        ? 'text-red-600 dark:text-red-400'
        : type === 'countdown'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400';

    const actionBg = isDestructive
        ? 'bg-red-600 hover:bg-red-700'
        : type === 'countdown'
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-emerald-600 hover:bg-emerald-700';

    const actionShadow = isDestructive
        ? 'shadow-red-500/20'
        : type === 'countdown'
            ? 'shadow-amber-500/20'
            : 'shadow-emerald-500/20';

    const handleBackgroundClick = () => {
        if (!isLoading) onClose();
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30" 
            onClick={handleBackgroundClick}
        >
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile handle */}
                <div className="flex justify-center mb-5 sm:hidden">
                    <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto border ${iconBg} ${isDestructive ? 'border-red-100 dark:border-red-800/30' : type === 'countdown' ? 'border-amber-100 dark:border-amber-800/30' : 'border-emerald-100 dark:border-emerald-800/30'}`}>
                    {isDestructive
                        ? <Warning weight="fill" className={`w-7 h-7 ${iconColor}`} />
                        : type === 'countdown'
                            ? <Lightning weight="fill" className={`w-7 h-7 ${iconColor}`} />
                            : <Trophy weight="fill" className={`w-7 h-7 ${iconColor}`} />
                    }
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98]'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3.5 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-md transition-all 
                            ${actionBg} ${actionShadow}
                            ${isLoading ? 'opacity-70 cursor-wait' : 'active:scale-[0.98]'}`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            actionLabel
                        )}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;