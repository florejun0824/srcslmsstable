// src/components/layout/AuroraBackground.jsx
import React, { memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Helper to switch colors based on the active 'Monet' theme
const getThemeColors = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': return ['bg-emerald-500', 'bg-red-500', 'bg-emerald-300'];
        case 'valentines': return ['bg-rose-500', 'bg-pink-500', 'bg-red-400'];
        case 'graduation': return ['bg-amber-400', 'bg-yellow-600', 'bg-orange-300'];
        case 'rainy': return ['bg-teal-600', 'bg-cyan-600', 'bg-slate-500'];
        case 'cyberpunk': return ['bg-fuchsia-600', 'bg-violet-600', 'bg-purple-500'];
        case 'spring': return ['bg-pink-400', 'bg-rose-400', 'bg-emerald-400'];
        case 'space': return ['bg-indigo-600', 'bg-violet-600', 'bg-blue-600'];
        // Default (Blue/Indigo mix)
        default: return ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500']; 
    }
};

const AuroraBackground = memo(({ children }) => {
    const { activeOverlay } = useTheme();
    const [c1, c2, c3] = getThemeColors(activeOverlay);

    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-slate-50 dark:bg-[#0c0c0e] selection:bg-indigo-500/30">
            {/* --- THE OPTIMIZED AURORA MESH --- */}
            {/* fixed inset-0 ensures it stays behind content while scrolling */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                
                {/* Blob 1: Top Left - Slow Rotation */}
                {/* We use opacity-40 and blur-80px to create the soft mesh effect */}
                <div className={`absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob ${c1} dark:mix-blend-screen dark:opacity-20`}></div>
                
                {/* Blob 2: Top Right - Delayed Animation */}
                <div className={`absolute top-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000 ${c2} dark:mix-blend-screen dark:opacity-20`}></div>
                
                {/* Blob 3: Bottom - Counter Movement */}
                <div className={`absolute -bottom-32 left-[20%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-4000 ${c3} dark:mix-blend-screen dark:opacity-20`}></div>

                {/* Noise Overlay (Adds texture without GPU cost) */}
                {/* This subtle grain makes the "glass" look real rather than just transparent */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                </div>
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
});

export default AuroraBackground;