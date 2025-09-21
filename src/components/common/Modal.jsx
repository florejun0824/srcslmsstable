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
  roundedClass = 'rounded-3xl',
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
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className={`relative w-full bg-neumorphic-base shadow-neumorphic flex flex-col ${roundedClass} ${sizeClasses[size]}`}
          >
            {/* Header Area */}
            {(title || showCloseButton) && (
              <div className="text-center p-6 pb-4 relative border-b border-gray-200">
                <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
                {description && (
                  <p className="mt-2 text-slate-500">{description}</p>
                )}

                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-all hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-600" />
                  </button>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className={`p-8 overflow-y-auto ${contentClassName}`}>
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
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  screen: 'max-w-screen-2xl',
};

export default Modal;
