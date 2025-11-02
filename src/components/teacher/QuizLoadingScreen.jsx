// QuizLoadingScreen.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

const loadingMessages = [
  "Analyzing key concepts from the lesson...",
  "Formulating challenging questions...",
  "Crafting clever distractors...",
  "Calibrating difficulty levels...",
  "Finalizing your personalized quiz!",
];

export default function QuizLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, []);

  const sparkles = [
    { id: 1, x: -35, y: -35, scale: 0.7, delay: 0 },
    { id: 2, x: 35, y: -20, scale: 0.5, delay: 0.3 },
    { id: 3, x: 0, y: 40, scale: 0.8, delay: 0.6 },
    { id: 4, x: -20, y: 25, scale: 0.6, delay: 0.9 },
    { id: 5, x: 30, y: 30, scale: 0.4, delay: 1.2 },
  ];

  return (
    // --- MODIFIED: Added dark theme background ---
    <div className="flex min-h-[350px] flex-col items-center justify-center space-y-8 p-10 text-center font-sans bg-slate-200 dark:bg-neumorphic-base-dark">
      
      {/* Neumorphic Inset Icon Animation */}
      {/* --- MODIFIED: Added dark theme styles --- */}
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
        {/* Central Icon */}
        {/* --- MODIFIED: Added dark theme icon --- */}
        <SparklesIcon className="h-16 w-16 text-sky-500 dark:text-sky-400" />
        
        {/* Emitted Sparkles */}
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              x: sparkle.x, 
              y: sparkle.y, 
              scale: [0, sparkle.scale, 0], 
              opacity: [0, 1, 0] 
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: sparkle.delay,
              ease: "easeInOut"
            }}
          >
            {/* --- MODIFIED: Added dark theme icon --- */}
            <SparklesIcon className="h-6 w-6 text-sky-400 dark:text-sky-400 opacity-70" />
          </motion.div>
        ))}
      </div>

      {/* Loading Text */}
      <div className="max-w-md">
        {/* --- MODIFIED: Added dark theme text --- */}
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Generating Your Quiz
        </h3>
        {/* --- MODIFIED: Added dark theme text --- */}
        <div className="mt-3 h-6 text-base text-slate-600 dark:text-slate-400">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {loadingMessages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}