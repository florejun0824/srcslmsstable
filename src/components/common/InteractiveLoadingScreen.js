import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Animation Styles for the Celestial Bloom UI ---
const animationStyles = `
    /* Keyframes for the outermost rings */
    @keyframes bloom-pulse-outer {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
    }
    
    /* Keyframes for the middle rings */
    @keyframes bloom-pulse-middle {
        0%, 100% { transform: scale(0.9); opacity: 0.8; }
        50% { transform: scale(1); opacity: 1; }
    }
    
    /* Keyframes for the central core */
    @keyframes bloom-pulse-core {
        0%, 100% { transform: scale(0.6); opacity: 1; }
        50% { transform: scale(0.7); opacity: 0.9; }
    }
    
    /* Keyframes for the stars' subtle pulse */
    @keyframes star-pulse {
        0%, 100% { r: 1; }
        50% { r: 2; }
    }
    
    .outer-anim { animation: bloom-pulse-outer 5s ease-in-out infinite; }
    .middle-anim { animation: bloom-pulse-middle 4s ease-in-out infinite; }
    .core-anim { animation: bloom-pulse-core 3s ease-in-out infinite; }
    .star-pulse-anim { animation: star-pulse 2s linear infinite; }
    .outer-rotate-anim { animation: rotate-slow 20s linear infinite; }
    .inner-rotate-anim { animation: rotate-fast 15s linear infinite reverse; }

    @keyframes rotate-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes rotate-fast {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;

// A greatly expanded list of humorous and engaging messages (at least 25)
const loadingMessages = [
    "Cultivating a celestial bloom of knowledge...",
    "Watching the lessons blossom...",
    "Igniting the flow of inspiration...",
    "Weaving a tapestry of learning...",
    "Building your digital masterpiece...",
    "Analyzing data streams...",
    "Constructing your curriculum...",
    "Warming up the creativity engines...",
    "Assembling atoms of knowledge...",
    "Teaching the AI about your topic...",
    "Turning good ideas into great lessons...",
    "Finding the perfect words...",
    "Ensuring every byte is perfectly placed...",
    "Awakening the core processing unit...",
    "Almost there! Just one more block to place...",
    "The algorithms are humming with delight...",
    "Crafting a lesson you'll actually enjoy...",
    "Unleashing the magic of learning...",
    "Bending reality to fit your curriculum...",
    "Don't worry, the digital ink is very fast.",
    "Loading the wisdom of the ages...",
];

// The new "CelestialBloomAnimation" component
const CelestialBloomAnimation = () => {
    return (
        <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                    <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow-filter"><feGaussianBlur stdDeviation="3" /></filter>
                </defs>
                
                <g transform="translate(100, 100)">
                    {/* Central pulsating core */}
                    <circle r="15" fill="url(#core-gradient)" className="core-anim" style={{ filter: 'url(#glow-filter)' }} />

                    {/* Inner intricate design */}
                    <g className="inner-rotate-anim" transform-origin="center center">
                        <path d="M 0,-40 Q 20,0 0,40 Q -20,0 0,-40 Z" fill="#c084fc" opacity="0.6" style={{ filter: 'url(#glow-filter)' }} />
                        <path d="M 0,-40 Q 20,0 0,40 Q -20,0 0,-40 Z" transform="rotate(45)" fill="#38bdf8" opacity="0.6" style={{ filter: 'url(#glow-filter)' }} />
                    </g>
                    
                    {/* Outer blooming rings */}
                    <g className="outer-rotate-anim" transform-origin="center center">
                        <circle r="60" stroke="#f472b6" strokeWidth="2" fill="none" opacity="0.4" className="outer-anim" />
                        <path d="M-80,0 A80,80 0 0,1 80,0 A80,80 0 0,1 -80,0 Z M-70,0 A70,70 0 0,0 70,0 A70,70 0 0,0 -70,0 Z" 
                            fill="none" stroke="#f472b6" strokeWidth="1" transform-origin="center center" className="middle-anim" />
                    </g>

                    {/* Random stars/particles */}
                    {[...Array(20)].map((_, i) => (
                        <circle
                            key={i}
                            cx={Math.random() * 160 - 80}
                            cy={Math.random() * 160 - 80}
                            r="1"
                            fill="#facc15"
                            className="star-pulse-anim"
                            style={{ animationDelay: `${Math.random() * 2}s` }}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};

/**
 * A loading screen that displays progress and cycles through engaging messages.
 * @param {number} currentLessonIndex The index of the current lesson (0-based).
 * @param {number} totalLessons The total number of lessons to be created.
 * @param {boolean} isSaving If true, shows a saving message.
 */
const InteractiveLoadingScreen = ({ currentLessonIndex = 0, totalLessons = 0, isSaving = false }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (isSaving) return;
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isSaving]);

    const currentMessage = isSaving ? "Almost there..." : loadingMessages[messageIndex];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 rounded-[3rem] overflow-hidden"
        >
            <style>{animationStyles}</style>

            <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center p-8 bg-white/40 border-2 border-slate-200 rounded-3xl backdrop-blur-xl shadow-lg shadow-gray-200/50">
                
                <CelestialBloomAnimation />
                
                <h2 className="relative z-10 text-3xl md:text-4xl font-extrabold text-slate-800 mb-2 tracking-wide">
                    {isSaving ? 'Saving Your Lesson...' : `Preparing Something Great For You!`}
                </h2>

                {/* Conditional rendering to fix the "1 of 0" bug */}
                {totalLessons > 0 && (
                    <p className="relative z-10 text-sm md:text-base text-slate-600 font-semibold mb-4">
                        Lesson {currentLessonIndex + 1} of {totalLessons}
                    </p>
                )}

                <div className="relative z-10 h-16 flex items-center justify-center px-4">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentMessage}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.5 }}
                            className="text-base md:text-lg text-slate-600 font-medium max-w-xs md:max-w-md"
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