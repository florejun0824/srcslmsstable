import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const loadingMessages = [
    "Calibrating the knowledge matrix...",
    "Compiling insights...",
    "Syncing with the learning cloud...",
    "Rendering your curriculum...",
    "Optimizing neural pathways...",
    "Assembling educational constructs...",
    "Engaging the creative core...",
    "Initializing the lesson stream...",
    "Polishing the final details...",
    "Structuring the data flow...",
    "Almost there, just a few more calculations...",
    "The digital architect is at work...",
    "Building a seamless learning experience...",
    "Unlocking new potentials...",
    "Crafting with precision and care...",
];

// --- MODIFIED: New CSS for Single Ring Spinner with Dynamic Color Change ---
const ringSpinnerStyles = `
/* Keyframes for continuous smooth spin */
@keyframes single-ring-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Keyframes for dynamic color change */
@keyframes color-pulse {
    0%   { border-color: rgba(0,0,0,0.1) rgba(0,0,0,0.1) #0ea5e9 #38bdf8; } /* Sky Blue */
    25%  { border-color: rgba(0,0,0,0.1) rgba(0,0,0,0.1) #6366f1 #3b82f6; } /* Indigo/Blue */
    50%  { border-color: rgba(0,0,0,0.1) rgba(0,0,0,0.1) #06b6d4 #22d3ee; } /* Cyan */
    75%  { border-color: rgba(0,0,0,0.1) rgba(0,0,0,0.1) #a855f7 #d946ef; } /* Purple/Fuchsia */
    100% { border-color: rgba(0,0,0,0.1) rgba(0,0,0,0.1) #0ea5e9 #38bdf8; }
}

/* Base class for the ring */
.single-ring-spinner {
    width: 36px;
    height: 36px;
    border: 4px solid; /* Thickness of the ring */
    border-radius: 50%;
    
    /* Apply both spin and color change */
    animation: single-ring-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite, 
               color-pulse 4s linear infinite; /* Slower, linear pulse for color cycle */
    
    transition: border-color 0.3s;
}

/* Dark Mode: Adjust the transparent part for dark background and use brighter colors */
.dark .single-ring-spinner {
    /* Base for dark mode pulse */
    animation: single-ring-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite, 
               color-pulse-dark 4s linear infinite;
    
    /* Initial state for dark mode */
    border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #38bdf8 #7dd3fc;
}

/* Dark Mode Keyframes */
@keyframes color-pulse-dark {
    0%   { border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #38bdf8 #7dd3fc; } /* Sky */
    25%  { border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #60a5fa #3b82f6; } /* Blue */
    50%  { border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #22d3ee #67e8f9; } /* Cyan */
    75%  { border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #a855f7 #c084fc; } /* Purple */
    100% { border-color: rgba(255,255,255,0.1) rgba(255,255,255,0.1) #38bdf8 #7dd3fc; }
}
`;

/**
 * Single Ring Spinner component.
 */
const SingleRingSpinner = () => {
    return (
        <div className="relative">
            <style>{ringSpinnerStyles}</style>
            <div className="single-ring-spinner"></div>
        </div>
    );
};

/**
 * An interactive loading screen with a neumorphic aesthetic.
 * @param {object} props The component props.
 * @param {boolean} props.isSaving If true, shows a saving message.
 * @param {{current: number, total: number}} props.lessonProgress The current and total number of lessons.
 */
const InteractiveLoadingScreen = ({ isSaving = false, lessonProgress = { current: 1, total: 1 } }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (isSaving) return;
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [isSaving]);

    const currentMessage = isSaving ? "Finalizing and saving your work..." : loadingMessages[messageIndex];
    const progressPercentage = lessonProgress.total > 0 ? (lessonProgress.current / lessonProgress.total) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-200/70 dark:bg-neumorphic-base-dark/70 backdrop-blur-sm"
        >
            <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center p-8 bg-slate-200 dark:bg-neumorphic-base-dark border border-slate-300/50 dark:border-transparent rounded-[2.75rem] shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg">
                
                <div className="mb-4">
                    <SingleRingSpinner />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                    {isSaving ? 'Saving Your Lesson' : `Crafting Materials`}
                </h2>

                <p className="text-base text-slate-600 dark:text-slate-300 mb-6 px-4">
                    {isSaving ? `Securing your new content.` : `Please wait while we generate your material.`}
                </p>

                {lessonProgress.total > 0 && (
                    <div className="w-full max-w-xs mb-4">
                        <div className="w-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-full h-2 shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] dark:shadow-neumorphic-inset-dark">
                            <motion.div
                                className="bg-sky-500 h-2 rounded-full shadow-[inset_1px_1px_2px_#0284c7,inset_-1px_-1px_2px_#38bdf8]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
                            Step {lessonProgress.current} of {lessonProgress.total}
                        </p>
                    </div>
                )}

                <div className="h-12 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentMessage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="text-sm text-slate-500 dark:text-slate-400 font-medium"
                        >
                            {currentMessage}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default InteractiveLoadingScreen;