import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const Modal = ({ isOpen, onClose, title, description, children, size = 'md', roundedClass = 'rounded-3xl', containerClassName = '' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                        className={`relative w-full bg-white/80 backdrop-blur-2xl shadow-2xl flex flex-col ring-1 ring-black/5 ${roundedClass} ${sizeClasses[size]} ${containerClassName}`}
                    >
                        {/* --- FIX STARTS HERE --- */}
                        {/* Header Area */}
                        <div className="text-center p-6 pb-4 relative">
                            <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                            {/* Conditionally render the description if it's provided */}
                            {description && (
                                <p className="mt-2 text-gray-500">{description}</p>
                            )}
                             <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                                aria-label="Close modal"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="px-8 pb-8 overflow-y-auto">
                            {children}
                        </div>
                        {/* --- FIX ENDS HERE --- */}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Kept your flexible sizing options
const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'screen': 'max-w-screen-2xl'
};

export default Modal;