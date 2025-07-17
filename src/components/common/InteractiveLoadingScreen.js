import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Animation Styles ---
// Styles adjusted for a light background.
const animationStyles = `
    /* Keyframes for the book's gentle float and glow */
    @keyframes book-pulse {
        0%, 100% { 
            transform: translateY(0px) scale(1); 
            filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
        }
        50% { 
            transform: translateY(-4px) scale(1.03); 
            filter: drop-shadow(0 0 16px rgba(129, 140, 248, 0.5));
        }
    }

    /* Keyframes for the book pages turning */
    @keyframes turn-page {
        0%, 20% { transform: rotateY(0deg); }
        80%, 100% { transform: rotateY(-180deg); }
    }

    /* Keyframes for particles spiraling in from the RIGHT */
    @keyframes spiral-absorb-right {
        0% {
            transform: rotate(0deg) translateX(100px) scale(1.2);
            opacity: 1;
        }
        100% {
            transform: rotate(360deg) translateX(0px) scale(0);
            opacity: 0;
        }
    }

    /* Keyframes for particles spiraling in from the LEFT */
    @keyframes spiral-absorb-left {
        0% {
            transform: rotate(0deg) translateX(-100px) scale(1.2);
            opacity: 1;
        }
        100% {
            transform: rotate(-360deg) translateX(0px) scale(0);
            opacity: 0;
        }
    }

    /* Keyframes for the glowing platform */
    @keyframes platform-glow {
        0%, 100% { opacity: 0.7; transform: scaleX(1); }
        50% { opacity: 1; transform: scaleX(1.05); }
    }

    /* Applying the animations */
    .book-anim {
        animation: book-pulse 6s ease-in-out infinite;
    }
    .page-flipper {
        transform-origin: 75px 45px;
        animation: turn-page 5s cubic-bezier(0.6, 0, 0.4, 1) infinite;
    }
    .particle-spiral-right {
        /* ✅ FIXED: Changed timing to ease-in for a clear absorption effect */
        animation: spiral-absorb-right 3s ease-in infinite;
        transform-origin: center;
    }
    .particle-spiral-left {
        /* ✅ FIXED: Changed timing to ease-in for a clear absorption effect */
        animation: spiral-absorb-left 3s ease-in infinite;
        transform-origin: center;
    }
    .platform-anim {
        animation: platform-glow 6s ease-in-out infinite;
        transform-origin: center;
    }
`;

// Loading messages (unchanged)
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
];

// The "EnchantedTomeAnimation" component with more particles
const EnchantedTomeAnimation = () => {
    // ✅ ADDED: More particles for a richer effect
    const rightParticles = [
        { delay: '0s', color: '#f59e0b', r: 2.5 },
        { delay: '-0.5s', color: '#f472b6', r: 2 },
        { delay: '-1s', color: '#d946ef', r: 2.5 },
        { delay: '-1.5s', color: '#22d3ee', r: 2 },
        { delay: '-2s', color: '#818cf8', r: 1.5 },
        { delay: '-2.5s', color: '#facc15', r: 2 },
        { delay: '-3s', color: '#f472b6', r: 2.5 },
        { delay: '-3.5s', color: '#22d3ee', r: 2 },
    ];
    
    // ✅ ADDED: More particles for a richer effect
    const leftParticles = [
        { delay: '-0.25s', color: '#22d3ee', r: 3 },
        { delay: '-0.75s', color: '#818cf8', r: 2.5 },
        { delay: '-1.25s', color: '#f59e0b', r: 2 },
        { delay: '-1.75s', color: '#d946ef', r: 2.5 },
        { delay: '-2.25s', color: '#f472b6', r: 1.5 },
        { delay: '-2.75s', color: '#facc15', r: 2.5 },
        { delay: '-3.25s', color: '#818cf8', r: 2 },
        { delay: '-3.75s', color: '#22d3ee', r: 2 },
    ];

    return (
        <div className="relative w-56 h-56 mx-auto mb-4 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <radialGradient id="platform-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(203, 213, 225, 0.5)" />
                        <stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
                    </radialGradient>
                    <filter id="glow-filter"><feGaussianBlur stdDeviation="1.5" /></filter>
                </defs>

                {/* Glowing Platform */}
                <ellipse cx="100" cy="150" rx="70" ry="20" fill="url(#platform-gradient)" className="platform-anim" />

                {/* Spiraling Particles */}
                <g transform="translate(100, 100)">
                    {/* Map over right particles */}
                    {rightParticles.map((p, i) => (
                        <circle key={`r-${i}`} cx="0" cy="0" r={p.r} fill={p.color} className="particle-spiral-right" style={{ animationDelay: p.delay }} />
                    ))}
                    {/* Map over left particles */}
                    {leftParticles.map((p, i) => (
                        <circle key={`l-${i}`} cx="0" cy="0" r={p.r} fill={p.color} className="particle-spiral-left" style={{ animationDelay: p.delay }} />
                    ))}
                </g>
                
                {/* Central Magical Book */}
                <g className="book-anim" transform="translate(30, 55) scale(1)">
                    <path d="M10 95 A 5 5 0 0 1 15 90 H 135 A 5 5 0 0 1 140 95 V 5 A 5 5 0 0 1 135 0 H 15 A 5 5 0 0 1 10 5 Z" fill="#312e81" />
                    <path d="M15 5 H 135 V 90 H 15 Z" fill="#4338ca" stroke="#a78bfa" strokeWidth="1" />
                    
                    <g className="page-flipper" style={{ animationDelay: '0s' }}><path d="M15 0 H 75 V 90 H 15 A 5 5 0 0 1 10 85 V 5 A 5 5 0 0 1 15 0 Z" fill="#e0e7ff" /></g>
                    <g className="page-flipper" style={{ animationDelay: '-0.5s' }}><path d="M15 0 H 75 V 90 H 15 A 5 5 0 0 1 10 85 V 5 A 5 5 0 0 1 15 0 Z" fill="#c7d2fe" /></g>
                    
                    <path d="M75 0 H 135 A 5 5 0 0 1 140 5 V 85 A 5 5 0 0 1 135 90 H 75 Z" fill="#3730a3" />
                    {/* Arcane Symbol */}
                    <g transform="translate(107.5, 45)" stroke="#facc15" strokeWidth="1.5" style={{ filter: 'url(#glow-filter)'}}>
                        <circle cx="0" cy="0" r="15" fill="none" />
                        <path d="M 0 -10 L 0 10 M -10 0 L 10 0" />
                        <circle cx="0" cy="0" r="5" fill="none" />
                    </g>
                </g>
            </svg>
        </div>
    );
};

// The main component that receives props from its parent
const InteractiveLoadingScreen = ({ topic, isSaving = false }) => {
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
        // Container with a new light theme
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center p-6 md:p-8 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <style>{animationStyles}</style>
            
            <EnchantedTomeAnimation />
            
            <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-2 tracking-wide">
                {isSaving ? 'Saving Your Lesson...' : `Generating Lesson on "${topic}"`}
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
