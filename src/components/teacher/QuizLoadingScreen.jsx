// QuizLoadingScreen.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

// The engaging loading messages are retained
const loadingMessages = [
  "Analyzing key concepts from the lesson...",
  "Formulating challenging questions...",
  "Crafting clever distractors...",
  "Calibrating difficulty levels...",
  "Finalizing your personalized quiz!",
];

export default function QuizLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  // Effect for cycling through the loading messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(messageInterval);
  }, []);

  // Configuration for the animated sparkles
  const sparkles = [
    { id: 1, x: -35, y: -35, scale: 0.7, delay: 0 },
    { id: 2, x: 35, y: -20, scale: 0.5, delay: 0.3 },
    { id: 3, x: 0, y: 40, scale: 0.8, delay: 0.6 },
    { id: 4, x: -20, y: 25, scale: 0.6, delay: 0.9 },
    { id: 5, x: 30, y: 30, scale: 0.4, delay: 1.2 },
  ];

  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center space-y-8 p-10 text-center font-sans bg-transparent">
      
      {/* Magical Burst Icon Animation */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Central Icon */}
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
            <SparklesIcon className="h-6 w-6 text-sky-400 dark:text-sky-300 opacity-70" />
          </motion.div>
        ))}
      </div>

      {/* Loading Text with Fluid Transitions */}
      <div className="max-w-md">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Generating Your Quiz
        </h3>
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