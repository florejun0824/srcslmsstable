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

/**
 * A smaller, iOS-style activity indicator component that stays in place.
 * It consists of 12 rotating bars.
 */
const IOSActivityIndicator = ({ size = 24, barWidth = 2, barHeight = 6, color = 'rgba(113, 113, 122, 0.7)' }) => {
    const rotationDuration = 1.0;
    const numBars = 12;
    const centerOffset = size / 2;

    return (
        <div
            className="relative"
            style={{ width: size, height: size }}
        >
            <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{
                    loop: Infinity,
                    ease: "linear",
                    duration: rotationDuration
                }}
            >
                {Array.from({ length: numBars }).map((_, i) => (
                    <div
                        key={`bar-${i}`}
                        className="absolute bg-zinc-500 rounded-full"
                        style={{
                            width: barWidth,
                            height: barHeight,
                            left: centerOffset - (barWidth / 2),
                            top: 0,
                            transformOrigin: `center ${size / 2}px`,
                            transform: `translateX(-50%) rotate(${i * (360 / numBars)}deg) translateY(-${size / 2 - barHeight / 2}px)`,
                            opacity: (1 - (i / numBars) * 0.75),
                            backgroundColor: color,
                        }}
                    />
                ))}
            </motion.div>
        </div>
    );
};

/**
 * An interactive loading screen with a futuristic "iOS 26" aesthetic.
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
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20"
        >
            <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center p-8 bg-gray-200/50 border border-white/30 rounded-[2.75rem] backdrop-blur-2xl shadow-2xl shadow-black/10">
                
                <div className="mb-4">
                    <IOSActivityIndicator size={24} barWidth={2} barHeight={6} />
                </div>
                
                <h2 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">
                    {isSaving ? 'Saving Your Lesson' : `Crafting Materials`}
                </h2>

                <p className="text-base text-zinc-600 mb-6 px-4">
                    {isSaving ? `Securing your new content.` : `Please wait while we generate your material.`}
                </p>

                {lessonProgress.total > 0 && (
                    <div className="w-full max-w-xs mb-4">
                        <div className="w-full bg-black/10 rounded-full h-2">
                            <motion.div
                                className="bg-zinc-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-2">
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
                            className="text-sm text-zinc-500 font-medium"
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