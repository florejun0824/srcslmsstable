import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Animation Styles ---
// Styles for the rotating rings, RGB effect, and the animated book.
const animationStyles = `
    .loader-container {
        perspective: 800px;
    }
    .ring {
        position: absolute;
        border-radius: 50%;
        border-style: solid;
        opacity: 0.9;
    }
    /* --- ROTATION KEYFRAMES (unchanged) --- */
    @keyframes rotate-one {
        0% { transform: rotateX(65deg) rotateZ(0deg); }
        100% { transform: rotateX(65deg) rotateZ(360deg); }
    }
    @keyframes rotate-two {
        0% { transform: rotateX(65deg) rotateZ(0deg); }
        100% { transform: rotateX(65deg) rotateZ(-360deg); }
    }
    @keyframes rotate-three {
        0% { transform: rotateX(0deg) rotateY(55deg) rotateZ(0deg); }
        100% { transform: rotateX(0deg) rotateY(55deg) rotateZ(360deg); }
    }
    @keyframes rotate-four {
        0% { transform: rotateX(0deg) rotateY(55deg) rotateZ(0deg); }
        100% { transform: rotateX(0deg) rotateY(55deg) rotateZ(-360deg); }
    }

    /* --- NEW RGB/HUE-ROTATE KEYFRAME --- */
    @keyframes rgb-cycle {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }

    /* --- UPDATED RING STYLES WITH RGB ANIMATION --- */
    .ring-1 {
        border-width: 3px;
        /* A bright base color for the hue rotation */
        border-color: #ff00de transparent #ff00de transparent;
        /* Combine rotation and color cycle animations */
        animation: rotate-one 3s linear infinite, rgb-cycle 4s linear infinite;
    }
    .ring-2 {
        border-width: 3px;
        border-color: transparent #00f2ff transparent #00f2ff;
        animation: rotate-two 3s linear infinite, rgb-cycle 4s linear infinite;
        /* Add a delay to the color cycle so it's out of sync with ring 1 */
        animation-delay: 0s, -1s;
    }
    .ring-3 {
        border-width: 3px;
        border-color: #ff00de transparent #ff00de transparent;
        animation: rotate-three 2.5s linear infinite, rgb-cycle 4s linear infinite;
        /* Add a different delay */
        animation-delay: 0s, -2s;
    }
    .ring-4 {
        border-width: 3px;
        border-color: transparent #00f2ff transparent #00f2ff;
        animation: rotate-four 2.5s linear infinite, rgb-cycle 4s linear infinite;
        /* Add a different delay */
        animation-delay: 0s, -3s;
    }

    /* --- BOOK ANIMATION (unchanged) --- */
    @keyframes turn-page {
        0%, 25% {
            transform: rotateY(0deg);
        }
        50%, 100% {
            transform: rotateY(-180deg);
        }
    }
    .page-flipper {
        transform-origin: left center;
        animation: turn-page 4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    }
`;

// Creative loading messages
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

// Updated book component with blue and white colors
const AnimatedBook = () => (
    <svg
        width="60"
        height="60"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Book Cover */}
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20v2H6.5A2.5 2.5 0 014 19.5z" fill="#2563eb" />
        <path d="M4 4.5A2.5 2.5 0 016.5 2H20v2H6.5A2.5 2.5 0 014 4.5z" fill="#2563eb" />
        {/* Pages */}
        <g className="page-flipper" style={{ animationDelay: '0s' }}>
            <path d="M4 4.5A2.5 2.5 0 016.5 2H12v17.5H6.5A2.5 2.5 0 014 17V4.5z" fill="#ffffff" />
        </g>
         <g className="page-flipper" style={{ animationDelay: '-0.2s' }}>
            <path d="M4 4.5A2.5 2.5 0 016.5 2H12v17.5H6.5A2.5 2.5 0 014 17V4.5z" fill="#dbeafe" />
        </g>
        <path d="M12 2h8.5A2.5 2.5 0 0123 4.5v12.5a2.5 2.5 0 01-2.5 2.5H12V2z" fill="#3b82f6" />
    </svg>
);


// The animation component, now with a child for the center element
const RotatingRingsAnimation = ({ children }) => (
    <div className="relative w-48 h-48 mx-auto mb-8 loader-container flex items-center justify-center">
        {/* The centered element */}
        <div className="absolute z-10">{children}</div>
        {/* The rings */}
        <div className="ring ring-1 w-48 h-48"></div>
        <div className="ring ring-2 w-48 h-48"></div>
        <div className="ring ring-3 w-36 h-36"></div>
        <div className="ring ring-4 w-36 h-36"></div>
    </div>
);

const InteractiveLoadingScreen = ({ topic = "your topic", isSaving = false }) => {
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
        // Using a light theme
        <div className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg min-h-screen text-slate-800">
            <style>{animationStyles}</style>
            
            <RotatingRingsAnimation>
                <AnimatedBook />
            </RotatingRingsAnimation>
            
            <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-2 tracking-wide">
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

// Main App component to render the loading screen
function App() {
    return (
        <div className="bg-white">
             <InteractiveLoadingScreen />
        </div>
    );
}

export default App;
