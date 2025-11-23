import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Fun, encouraging messages
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
    className="relative h-14 w-14 flex-shrink-0"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Center Logo Container - Glass Effect */}
    <div className="absolute inset-1 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-inner border border-white/20 dark:border-white/5 flex items-center justify-center z-10 overflow-hidden">
        <img
          src="/logo.png"
          alt="School Logo"
          className="h-8 w-8 object-contain opacity-90"
        />
    </div>

    {/* Outer Blue Ring */}
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-0"
      animate={{ rotate: 360 }}
      transition={{ 
        repeat: Infinity, 
        ease: "linear", 
        duration: 1.5 
      }}
    >
      <defs>
        <linearGradient id="g-blue-glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke="url(#g-blue-glass)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className="drop-shadow-[0_0_8px_rgba(0,122,255,0.4)]"
      />
    </motion.svg>

    {/* Inner Teal/Purple Ring */}
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-0"
      animate={{ rotate: -360 }}
      transition={{ 
        repeat: Infinity, 
        ease: "linear", 
        duration: 2.2 
      }}
    >
      <defs>
        <linearGradient id="g-purple-glass" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#AF52DE" stopOpacity="1" />
          <stop offset="100%" stopColor="#5856D6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="36"
        stroke="url(#g-purple-glass)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="80 200"
        className="drop-shadow-[0_0_6px_rgba(175,82,222,0.4)]"
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
          className="fixed inset-0 z-[9999] flex items-center justify-center font-sans"
        >
          {/* Dark Overlay with Blur */}
          <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-all" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            // macOS 26 Glass Capsule Style
            className="
              relative flex w-auto min-w-[300px] max-w-[90%] items-center gap-5 
              rounded-[28px] pr-8 pl-5 py-4
              bg-white/75 dark:bg-[#1c1c1e]/80 
              backdrop-blur-2xl backdrop-saturate-150
              shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]
              border border-white/40 dark:border-white/10
              ring-1 ring-black/5 dark:ring-white/5
            "
          >
            <SpinningRings />

            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-0.5">
                SRCS Portal
              </p>
              <div className="h-5 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={message}
                    initial={{ y: 15, opacity: 0, filter: 'blur(4px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: -15, opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="text-[13px] font-medium text-gray-500 dark:text-gray-400 truncate"
                  >
                    {message}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Spinner;