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

// --- macOS 26 Spinner CSS ---
const ringSpinnerStyles = `
@keyframes macos-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.macos-spinner {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2.5px solid rgba(0, 122, 255, 0.15);
    border-top-color: #007AFF;
    animation: macos-spin 0.8s infinite linear;
}
`;

// 1. ADD: 'topic' to props destructuring
const InteractiveLoadingScreen = ({ isLoading, message, topic, lessonProgress }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // 2. ADD: Robust check. If isLoading is undefined, assume we want to show it (default true).
    const shouldShow = isLoading === undefined ? true : isLoading;

    // Cycle through messages
    useEffect(() => {
        if (!shouldShow) return; // 3. UPDATE: Use the new check
        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [shouldShow]);

    // 4. UPDATE: Use 'message', fallback to 'topic', fallback to defaults
    const currentMessage = message || topic || loadingMessages[currentMessageIndex];

    const progressPercentage = lessonProgress 
        ? Math.min(100, Math.max(0, (lessonProgress.current / lessonProgress.total) * 100))
        : 0;

    // 5. UPDATE: Use the new check
    if (!shouldShow) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-100/40 dark:bg-black/60 backdrop-blur-md"
        >
            <style>{ringSpinnerStyles}</style>

            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-[360px] mx-4 p-8 rounded-[28px] 
                           bg-white/85 dark:bg-[#1c1c1e]/85 
                           backdrop-blur-2xl 
                           shadow-2xl shadow-black/10 ring-1 ring-black/5 dark:ring-white/10
                           flex flex-col items-center text-center"
            >
                <div className="mb-8 relative">
                    <div className="macos-spinner"></div>
                </div>

                {lessonProgress && (
                    <div className="w-full mb-6 px-2">
                        <div className="h-[5px] w-full bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-[#007AFF] rounded-full shadow-[0_0_8px_rgba(0,122,255,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.5, ease: "circOut" }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Processing
                            </span>
                            <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300">
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                    </div>
                )}

                <div className="h-10 flex items-center justify-center w-full">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentMessage}
                            initial={{ opacity: 0, y: 4, filter: 'blur(2px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -4, filter: 'blur(2px)' }}
                            transition={{ duration: 0.35 }}
                            className="text-[14px] font-medium text-slate-800 dark:text-white leading-snug"
                        >
                            {currentMessage}
                        </motion.p>
                    </AnimatePresence>
                </div>
                
                {lessonProgress && (
                     <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Item {lessonProgress.current} of {lessonProgress.total}
                    </p>
                )}

            </motion.div>
        </motion.div>
    );
};

export default InteractiveLoadingScreen;