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
    isLoading = false // <-- Added loading state prop
}) => {
    if (!isOpen) return null;

    const iconBg = isDestructive
        ? 'bg-red-100 dark:bg-red-500/15'
        : type === 'countdown'
            ? 'bg-amber-100 dark:bg-amber-500/15'
            : 'bg-emerald-100 dark:bg-emerald-500/15';

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

    // Prevent closing if we are currently processing
    const handleBackgroundClick = (e) => {
        if (!isLoading) {
            onClose();
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" 
            onClick={handleBackgroundClick}
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white dark:bg-[#2b2d31] w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-7 border border-slate-200/50 dark:border-white/[0.06] shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* M3 Bottom sheet handle (mobile) */}
                <div className="flex justify-center mb-5 sm:hidden">
                    <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 mx-auto ${iconBg}`}>
                    {isDestructive
                        ? <Warning weight="fill" className={`w-7 h-7 ${iconColor}`} />
                        : type === 'countdown'
                            ? <Lightning weight="fill" className={`w-7 h-7 ${iconColor}`} />
                            : <Trophy weight="fill" className={`w-7 h-7 ${iconColor}`} />
                    }
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-center text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{message}</p>

                {/* M3 Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`flex-1 py-3.5 rounded-full font-semibold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/[0.06] transition-colors
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-white/[0.1] active:scale-[0.98]'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3.5 rounded-full flex items-center justify-center font-semibold text-sm text-white shadow-md transition-all 
                            ${actionBg} 
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