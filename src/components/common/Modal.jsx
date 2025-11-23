import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  roundedClass = 'rounded-[2.5rem]', // Increased default roundness for modern feel
  containerClassName = '',
  contentClassName = '',
  showCloseButton = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${containerClassName}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Panel - Glassmorphism Style */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
                relative w-full flex flex-col max-h-full
                bg-white/90 dark:bg-[#18181b]/90 
                backdrop-blur-3xl 
                border border-white/20 dark:border-white/5 
                shadow-2xl 
                ${roundedClass} 
                ${sizeClasses[size]}
            `}
          >
            {/* Header Area */}
            {(title || showCloseButton) && (
              <div className="relative px-8 py-6 border-b border-black/5 dark:border-white/5 flex-shrink-0">
                {title && (
                    <div className="pr-10"> 
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {title}
                        </h3>
                        {description && (
                            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                )}

                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/50"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className={`p-8 overflow-y-auto custom-scrollbar flex-1 ${contentClassName}`}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  screen: 'max-w-[95vw]',
};

export default Modal;