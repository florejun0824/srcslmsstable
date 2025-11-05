import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer, 
  onSubmit, 
  size = 'md',
  roundedClass = 'rounded-3xl',
  containerClassName = '',
  contentClassName = '',
  showCloseButton = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        // --- MODIFIED THIS LINE ---
        // Was: `... p-4 ${containerClassName}`
        // Now: `... p-4 pb-24 md:pb-4 ${containerClassName}`
        // This adds 6rem (96px) of padding to the bottom on mobile,
        // pushing the modal up to clear the nav bar.
        // It resets to p-4 (1rem) on medium screens (md:) and larger.
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 md:pb-4 ${containerClassName}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.form
            onSubmit={onSubmit} 
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className={`relative w-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark flex flex-col ${roundedClass} ${sizeClasses[size]} max-h-[95vh]`}
          >
            {/* Header Area */}
            {(title || showCloseButton) && (
              <div className="text-center p-6 pb-4 relative border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                {description && (
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
                )}

                {showCloseButton && (
                  <button
                    type="button" 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                )}
              </div>
            )}

            {/* Content Area (Scrollable) */}
            <div className={`p-6 overflow-y-auto ${contentClassName}`}>
              {children}
            </div>

            {/* Footer Area (Sticky) */}
            {footer && (
              <div className="p-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.form>
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
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  screen: 'max-w-screen-2xl',
};

export default Modal;