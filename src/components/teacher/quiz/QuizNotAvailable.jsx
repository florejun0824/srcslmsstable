import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import { ClockIcon } from '@heroicons/react/24/solid';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizNotAvailable() {
    const { availabilityMessage } = useQuiz();

    return (
        <div className="relative overflow-hidden p-8 sm:p-12 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-3xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            text-center flex flex-col items-center justify-center min-h-[400px]">
            
            {/* Icon Container */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full transform scale-150"></div>
                <div className="relative h-24 w-24 flex items-center justify-center rounded-full 
                    bg-gradient-to-b from-white/80 to-white/20 dark:from-white/10 dark:to-white/5
                    border border-white/50 dark:border-white/10 shadow-lg backdrop-blur-md">
                    <ClockIcon className="h-12 w-12 text-blue-500/80 dark:text-blue-400" />
                </div>
            </div>

            {/* Text Content */}
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
                Not Available Yet
            </h3>
            
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-sm leading-relaxed">
                {availabilityMessage || 'This quiz is currently closed or hasn\'t started yet. Please check back later.'}
            </p>
        </div>
    );
}