import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';

// Expanded and more creative loading messages
const loadingMessages = [
    "Brewing up some brilliant ideas...",
    "Assembling atoms of knowledge...",
    "Teaching the AI about your topic...",
    "Turning good ideas into great lessons...",
    "Unpacking the mysteries of the universe...",
    "Finding the perfect words...",
    "Polishing the lesson plan...",
    "Consulting the muses of education...",
    "Just a moment, creating something amazing!",
    "Did you know? The human brain has about 86 billion neurons.",
    "Warming up the creativity engines...",
    "Connecting concepts and weaving narratives...",
    "Crafting educational magic...",
    "The neural network is firing on all cylinders!",
];

// A more visually engaging SVG animation component
const ThinkingAnimation = () => (
    <div className="relative w-24 h-24 md:w-28 md:h-28">
        {/* Base brain icon with a subtle gradient */}
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full text-indigo-200 opacity-50">
            <defs>
                <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A5B4FC" />
                    <stop offset="100%" stopColor="#C7D2FE" />
                </linearGradient>
            </defs>
            <path d="M12 2a4.5 4.5 0 00-4.5 4.5c0 1.04.36 2.08.98 2.92C7.16 11.48 6 13.62 6 16c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4 0-2.38-1.16-4.52-2.48-6.58.62-.84.98-1.88.98-2.92A4.5 4.5 0 0012 2zm0 2c1.38 0 2.5 1.12 2.5 2.5S13.38 9 12 9s-2.5-1.12-2.5-2.5S10.62 4 12 4z" fill="url(#brainGradient)" />
        </svg>

        {/* Animated "thinking" pulses */}
        <div className="absolute inset-0">
            <span className="absolute block w-3 h-3 bg-indigo-500 rounded-full animate-pulse" style={{ top: '30%', left: '45%', animationDelay: '0s' }}></span>
            <span className="absolute block w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ top: '45%', left: '30%', animationDelay: '0.2s' }}></span>
            <span className="absolute block w-3 h-3 bg-indigo-500 rounded-full animate-pulse" style={{ top: '60%', left: '60%', animationDelay: '0.4s' }}></span>
            <span className="absolute block w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ top: '25%', left: '65%', animationDelay: '0.6s' }}></span>
        </div>
    </div>
);

// New Progress Circle Component
const ProgressCircle = ({ progress }) => {
    const size = 140;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Animate the progress value for a smooth counter
    const animatedProgress = useSpring(0, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        animatedProgress.set(progress);
    }, [animatedProgress, progress]);

    const displayProgress = useTransform(animatedProgress, (v) => Math.round(v));

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <motion.svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#818CF8" />
                        <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                </defs>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-slate-200"
                    fill="transparent"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke="url(#progressGradient)"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={useTransform(animatedProgress, v => circumference - (v / 100) * circumference)}
                />
            </motion.svg>
            <div className="absolute inset-0 flex items-center justify-center">
                 <motion.span className="text-xl font-bold text-slate-700">
                    {displayProgress}
                </motion.span>
                <span className="text-sm font-bold text-slate-500">%</span>
            </div>
        </div>
    );
};


const InteractiveLoadingScreen = ({ topic, isSaving, generationProgress }) => {
    const [messageIndex, setMessageIndex] = useState(0);
    // This state is for demonstration purposes only.
    // In a real app, `generationProgress` would be passed as a prop from the parent component.
    const [simulatedProgress, setSimulatedProgress] = useState(0);

    useEffect(() => {
        if (isSaving || generationProgress) return; // Don't simulate if saving or if real progress is provided

        // Simulate progress from 0 to 99 over a few seconds
        const interval = setInterval(() => {
            setSimulatedProgress(prev => {
                if (prev >= 99) {
                    clearInterval(interval);
                    return 99;
                }
                return prev + 1;
            });
        }, 80); // Adjust timing as needed

        return () => clearInterval(interval);
    }, [isSaving, generationProgress]);

    useEffect(() => {
        if (isSaving) return; // Don't cycle messages when saving

        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3500); // Change message every 3.5 seconds

        return () => clearInterval(interval);
    }, [isSaving]);

    const currentMessage = isSaving ? "Almost there..." : loadingMessages[messageIndex];
    const progress = generationProgress !== undefined ? generationProgress : simulatedProgress;

    return (
        <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-slate-50 to-gray-100 rounded-lg">
            <div className="relative flex items-center justify-center mb-6">
                <ProgressCircle progress={progress} />
                <div className="absolute">
                    <ThinkingAnimation />
                </div>
            </div>
            
            <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-2">
                {isSaving ? 'Saving Your Work...' : `Generating Lesson on "${topic}"`}
            </h2>

            <div className="h-12 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={currentMessage}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.5 }}
                        className="text-sm md:text-base text-slate-600"
                    >
                        {currentMessage}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default InteractiveLoadingScreen;
