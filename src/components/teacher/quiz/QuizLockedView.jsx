import React from 'react';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';

/**
 * Android 17 Material You Design Overhaul
 * Features: Tonal Surfaces, Deep Radii, High-Contrast Text, Expressive Error Colors
 */
export default function QuizLockedView() {
    return (
        <div className="relative overflow-hidden p-8 sm:p-12 rounded-none sm:rounded-[36px] 
            bg-[#F8F9FA] dark:bg-[#131314] 
            text-center flex flex-col items-center justify-center min-h-[500px] h-full sm:h-auto
            transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]">

            {/* Icon Container (Material You Error Tonal Palette) */}
            <div className="relative mb-10 flex items-center justify-center animate-in zoom-in-90 duration-500 ease-[cubic-bezier(0.2,0,0,1)]">
                {/* Main Tonal Circle */}
                <div className="h-28 w-28 sm:h-32 sm:w-32 flex items-center justify-center rounded-full 
                    bg-[#FFDAD6] dark:bg-[#93000A] transition-colors duration-500">
                    <LockClosedIcon className="h-14 w-14 sm:h-16 sm:w-16 text-[#410002] dark:text-[#FFDAD6]" />
                </div>
                
                {/* Overlapping Error Badge */}
                <div className="absolute -bottom-2 -right-2 bg-[#BA1A1A] dark:bg-[#FFB4AB] text-white dark:text-[#410002] p-2.5 rounded-full border-4 border-[#F8F9FA] dark:border-[#131314] transition-colors duration-500 shadow-sm">
                    <ShieldExclamationIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
            </div>

            {/* Text Content */}
            <h3 className="text-[28px] sm:text-[34px] font-bold text-[#1A1C1E] dark:text-[#E3E2E6] tracking-tight mb-4 animate-in slide-in-from-bottom-2 duration-500">
                Access Locked
            </h3>
            
            <div className="space-y-4 max-w-sm mx-auto w-full animate-in slide-in-from-bottom-4 duration-700">
                {/* Highlighted Warning Pill */}
                <div className="p-4 sm:p-5 rounded-[28px] bg-[#FFDAD6]/60 dark:bg-[#93000A]/40 transition-colors">
                    <p className="text-[15px] sm:text-[16px] text-[#410002] dark:text-[#FFB4AB] font-semibold leading-relaxed">
                        This quiz has been locked due to security warnings.
                    </p>
                </div>

                {/* Subtext */}
                <p className="text-[14px] sm:text-[15px] text-[#74777F] dark:text-[#8E9099] font-medium leading-relaxed px-4">
                    Please contact your teacher to request an unlock.
                </p>
            </div>
        </div>
    );
}