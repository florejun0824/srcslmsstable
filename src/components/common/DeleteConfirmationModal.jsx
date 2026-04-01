// src/components/common/DeleteConfirmationModal.jsx
import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { 
    ExclamationTriangleIcon,
    XMarkIcon 
} from '@heroicons/react/24/outline';

const DeleteConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Delete Announcement?", 
    message = "Are you sure you want to delete this? This action cannot be undone.",
    confirmText = "Delete",
    isDeleting = false
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="relative w-full max-w-sm mx-auto my-auto p-4 focus:outline-none" onClick={(e) => e.stopPropagation()}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[32px] border border-white/40 dark:border-white/10 shadow-2xl p-8"
                >
                    {/* Header: Warning Icon */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                            <ExclamationTriangleIcon className="w-10 h-10" />
                        </div>
                        
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
                            {title}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="px-6 py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="px-6 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isDeleting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : confirmText}
                        </button>
                    </div>

                    {/* Close corner (Internal) */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmationModal;
