import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Fun, encouraging messages to display while loading
const loadingMessages = [
  'Assembling knowledge...',
  'Polishing the pixels...',
  'Brewing fresh data...',
  'Warming up the servers...',
  'Aligning the satellites...',
  'Unpacking brilliance...',
  'Calibrating circuits...',
  'Enhancing the experience...',
];

const SpinningRings = memo(() => (
  <motion.div 
    className="relative h-16 w-16 flex-shrink-0"
    animate={{ scale: [1, 1.04, 1] }} // Keyframes for pulse
    transition={{ 
      scale: { 
        repeat: Infinity, 
        duration: 2.5, 
        ease: "easeInOut" 
      } 
    }}
  >
    {/* Inner circle background */}
    {/* --- MODIFIED: Added dark mode classes --- */}
    <div className="absolute inset-2 h-12 w-12 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex items-center justify-center">
        <img
          src="/logo.png"
          alt="School Logo"
          className="h-10 w-10 rounded-full object-cover"
        />
    </div>
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 [filter:drop-shadow(0_0_6px_rgba(96,165,250,0.5))]"
      animate={{ rotate: 360 }}
      transition={{ 
        repeat: Infinity, 
        ease: 'linear', 
        duration: 1.2 
      }}
    >
      <defs>
        <linearGradient id="g-blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#g-blue)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="200 360"
      />
    </motion.svg>
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 [filter:drop-shadow(0_0_4px_rgba(94,234,212,0.5))]"
      animate={{ rotate: -360 }}
      transition={{ 
        repeat: Infinity, 
        ease: 'linear', 
        duration: 2 
      }}
    >
      <defs>
        <linearGradient id="g-teal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="url(#g-teal)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="150 360"
      />
    </motion.svg>
  </motion.div>
));


const Spinner = ({ isLoading = true }) => {
  const [message, setMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setMessage((prevMessage) => {
          const currentIndex = loadingMessages.indexOf(prevMessage);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          // --- MODIFIED: Themed backdrop ---
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-sm font-sans"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            // --- MODIFIED: Themed card ---
            className="flex w-[320px] items-center gap-4 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark p-4 shadow-neumorphic dark:shadow-neumorphic-dark"
          >
            
            <SpinningRings />

            <div className="flex flex-col overflow-hidden">
              {/* --- CHANGE 1: Applied gradient text classes --- */}
              <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
                SRCS Learning Portal
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  // --- MODIFIED: Themed message text ---
                  className="text-sm text-slate-600 dark:text-slate-300"
                >
                  {message}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Spinner;