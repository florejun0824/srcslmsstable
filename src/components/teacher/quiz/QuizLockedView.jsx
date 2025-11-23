import React from 'react';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizLockedView() {
    return (
        <div className="relative overflow-hidden p-8 sm:p-12 rounded-[32px] 
            bg-gray-100/60 dark:bg-gray-900/40 
            backdrop-blur-3xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            text-center flex flex-col items-center justify-center min-h-[400px]">

            {/* Icon Container */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full transform scale-150"></div>
                <div className="relative h-24 w-24 flex items-center justify-center rounded-full 
                    bg-gradient-to-br from-gray-50/80 to-gray-200/50 dark:from-white/10 dark:to-white/5
                    border border-white/50 dark:border-white/10 shadow-inner backdrop-blur-md">
                    <LockClosedIcon className="h-10 w-10 text-gray-700 dark:text-gray-300" />
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1.5 rounded-full shadow-sm border-2 border-white dark:border-gray-800">
                        <ShieldExclamationIcon className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* Text Content */}
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                Access Locked
            </h3>
            
            <div className="space-y-1">
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                    This quiz has been locked due to security warnings.
                </p>
                <p className="text-base text-gray-400 dark:text-gray-500">
                    Please contact your teacher to unlock this assessment.
                </p>
            </div>
        </div>
    );
}