import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function QuizLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
      <div className="relative flex items-center justify-center h-20 w-20">
        {/* Pulsing background glow */}
        <div className="absolute h-full w-full bg-blue-500 rounded-full animate-ping opacity-60"></div>
        {/* Icon */}
        <div className="relative flex items-center justify-center h-16 w-16 bg-white rounded-full shadow-md">
          <SparklesIcon className="h-10 w-10 text-blue-500" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-medium text-gray-800">Crafting Your Quiz...</h3>
        <p className="text-sm text-gray-500 mt-1">The AI is analyzing the lesson and building questions.</p>
        <p className="text-sm text-gray-500">This may take a moment.</p>
      </div>
    </div>
  );
}