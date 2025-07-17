import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';

// Array of engaging messages to display while loading
const loadingMessages = [
  "Analyzing key concepts from the lesson...",
  "Formulating challenging questions...",
  "Crafting clever distractors...",
  "Calibrating difficulty levels...",
  "Finalizing your personalized quiz!",
];

export default function RefinedQuizLoadingScreen() {
  // State for the animated ellipsis
  const [dots, setDots] = useState('');
  // State for the cycling loading message
  const [messageIndex, setMessageIndex] = useState(0);

  // Effect for the animated ellipsis
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500); // Changes every 0.5s

    return () => clearInterval(dotsInterval);
  }, []);

  // Effect for cycling through loading messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500); // Changes every 2.5s

    return () => clearInterval(messageInterval);
  }, []);

  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center space-y-8 bg-slate-50 p-10 text-center">
      {/* Animated Spinner Icon */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Outer Ring (slower, clockwise) */}
        <div className="absolute h-full w-full animate-spin-slow rounded-full border-8 border-dashed border-sky-200"></div>
        {/* Inner Ring (faster, counter-clockwise) */}
        <div className="absolute h-20 w-20 animate-[spin_2s_linear_infinite_reverse] rounded-full border-4 border-dotted border-sky-400"></div>
        {/* Central Icon */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl">
          <SparklesIcon className="h-12 w-12 animate-pulse text-sky-500 [animation-duration:1.5s]" />
        </div>
      </div>

      {/* Loading Text */}
      <div className="max-w-md">
        <h3 className="text-2xl font-bold text-slate-800">
          Crafting Your Quiz{dots}
        </h3>
        <p className="mt-3 text-base text-slate-600 transition-opacity duration-500 ease-in-out">
          {loadingMessages[messageIndex]}
        </p>
      </div>
    </div>
  );
}