import React, { useState, useEffect, useRef, useCallback } from 'react';

const AIEtherealCoreButton = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const buttonRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartedAt = useRef({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Define dimensions for the AI Button
    const BUTTON_WIDTH_DESKTOP = 70; // Slightly larger for a prominent button
    const BUTTON_HEIGHT_DESKTOP = 70;
    const BUTTON_WIDTH_MOBILE = 55;
    const BUTTON_HEIGHT_MOBILE = 55;

    const getCurrentButtonDimensions = useCallback(() => {
        return window.innerWidth < 768
            ? { width: BUTTON_WIDTH_MOBILE, height: BUTTON_HEIGHT_MOBILE }
            : { width: BUTTON_WIDTH_DESKTOP, height: BUTTON_HEIGHT_DESKTOP };
    }, []);

    // Initial power-on animation state
    const [isPoweredOn, setIsPoweredOn] = useState(false);

    // Sequence for power-on
    useEffect(() => {
        const powerOnTimer = setTimeout(() => {
            setIsPoweredOn(true);
        }, 500); // Give it a moment to appear before powering on
        return () => clearTimeout(powerOnTimer);
    }, []);

    // Random idle animations
    useEffect(() => {
        let timeoutId;
        const scheduleNextAnimation = () => {
            const delay = Math.random() * 5000 + 3000;
            timeoutId = setTimeout(() => {
                const animations = ['pulse', '']; // 'pulse' for subtle glow, '' for stillness
                const nextAnimation = animations[Math.floor(Math.random() * animations.length)];
                setAnimationState(nextAnimation);
                if (nextAnimation !== '') { // If it's a pulse, clear after a duration
                    setTimeout(() => setAnimationState(''), 1000);
                }
                scheduleNextAnimation();
            }, delay);
        };
        if (isPoweredOn) {
            scheduleNextAnimation();
        }
        return () => clearTimeout(timeoutId);
    }, [isPoweredOn]);

    // Initial positioning and resize handling
    useEffect(() => {
        const handleResize = () => {
            const { width: currentButtonWidth, height: currentButtonHeight } = getCurrentButtonDimensions();
            const mobileNavHeight = window.innerWidth < 768 ? 60 : 0; // Assuming a 60px mobile nav

            let initialLeft = window.innerWidth - currentButtonWidth - 30; // Padding from right
            let initialTop = window.innerHeight - currentButtonHeight - 30 - mobileNavHeight; // Padding from bottom

            initialLeft = Math.max(0, Math.min(initialLeft, window.innerWidth - currentButtonWidth));
            initialTop = Math.max(0, Math.min(initialTop, window.innerHeight - currentButtonHeight - mobileNavHeight));

            setPosition({ left: initialLeft, top: initialTop });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getCurrentButtonDimensions]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        setAnimationState('hover');
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        setAnimationState('idle');
    }, []);

    // Dragging logic
    const handleMouseDown = useCallback((e) => {
        if (buttonRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.clientX, y: e.clientY };
            const bbox = buttonRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - bbox.left, y: e.clientY - bbox.top });
            setAnimationState('drag-start');
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const { width: currentButtonWidth, height: currentButtonHeight } = getCurrentButtonDimensions();
        const newLeft = e.clientX - offset.x;
        const newTop = e.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const mobileNavHeight = (viewportWidth < 768) ? 60 : 0;

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - currentButtonWidth;
        const maxTop = viewportHeight - currentButtonHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
    }, [isDragging, offset, getCurrentButtonDimensions]);

    const handleMouseUp = useCallback((e) => {
        setIsDragging(false);
        setAnimationState('idle');
        const movedX = Math.abs(e.clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.clientY - dragStartedAt.current.y);
        if (movedX < 5 && movedY < 5) {
            onClick(); // Trigger click if barely moved
        }
        e.stopPropagation();
    }, [onClick]);

    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1 && buttonRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            const touch = e.touches[0];
            const bbox = buttonRef.current.getBoundingClientRect();
            setOffset({ x: touch.clientX - bbox.left, y: touch.clientY - bbox.top });
            setAnimationState('drag-start');
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const { width: currentButtonWidth, height: currentButtonHeight } = getCurrentButtonDimensions();
        const touch = e.touches[0];
        const newLeft = touch.clientX - offset.x;
        const newTop = touch.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const mobileNavHeight = 60;

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - currentButtonWidth;
        const maxTop = viewportHeight - currentButtonHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
        e.preventDefault();
    }, [isDragging, offset, getCurrentButtonDimensions]);

    const handleTouchEnd = useCallback((e) => {
        setIsDragging(false);
        setAnimationState('idle');
        const movedX = Math.abs(e.changedTouches[0].clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.changedTouches[0].clientY - dragStartedAt.current.y);
        if (movedX < 5 && movedY < 5) {
            onClick();
        }
        e.stopPropagation();
    }, [onClick]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    return (
        <>
            <style jsx>{`
                /* Base variables for easy scaling and theming */
                :root {
                    --ai-button-primary: #1a0033; /* Dark purple */
                    --ai-button-secondary: #4a007f; /* Lighter purple */
                    --ai-button-accent: #b366ff; /* Bright violet */
                    --ai-button-core: #e6e6ff; /* Pale white/blue for core */

                    /* Glow colors - ethereal and vibrant */
                    --ai-glow-outer: rgba(179, 102, 255, 0.6); /* Violet */
                    --ai-glow-inner: rgba(230, 230, 255, 0.9); /* Bright white/blue */
                    --ai-shadow-alpha: 0.8;
                }

                /* Container for the AI button, fixed position */
                .ai-button-container-fixed {
                    position: fixed;
                    width: ${BUTTON_WIDTH_DESKTOP}px; /* Default desktop size */
                    height: ${BUTTON_HEIGHT_DESKTOP}px; /* Default desktop size */
                    z-index: 1000;
                    cursor: grab;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%; /* Start with a circular base */
                    overflow: hidden; /* Hide overflow of shapes */
                    background: radial-gradient(circle at center, var(--ai-button-secondary) 0%, var(--ai-button-primary) 100%);
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5); /* Subtle depth */

                    /* Overall subtle glow and animation */
                    filter: drop-shadow(0 0 10px var(--ai-glow-outer));
                    will-change: top, left, transform, filter;
                    animation:
                        neon-float 5s ease-in-out infinite,
                        pulse-glow 3s linear infinite alternate,
                        initial-power-on 1.5s ease-out forwards; /* New power-on animation */
                    transition: transform 0.3s ease-in-out, filter 0.3s ease-in-out;
                }
                .ai-button-container-fixed.dragging {
                    cursor: grabbing;
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 20px var(--ai-glow-outer));
                    animation: none; /* Pause idle animations when dragging */
                }
                .ai-button-container-fixed.drag-start {
                    animation: drag-jolt 0.3s ease-out; /* Short jolt on drag start */
                }
                .ai-button-container-fixed.hover .ai-button-svg {
                    transform: scale(1.05); /* Slightly bigger on hover */
                }
                .ai-button-container-fixed.powered-off {
                    opacity: 0;
                    transform: translateY(20px) scale(0.5);
                    filter: drop-shadow(0 0 0 transparent);
                }

                /* Inner SVG for artistic elements */
                .ai-button-svg {
                    width: 80%; /* Make SVG slightly smaller than container to allow background to show */
                    height: 80%;
                    transform: scale(1); /* No initial internal scale */
                    transition: transform 0.3s ease-out;
                    animation: subtle-hum 4s ease-in-out infinite alternate; /* Humming animation */
                }

                /* SVG Paths styling */
                .ai-path-inner-glow {
                    fill: url(#coreGradient); /* Use a gradient for the inner glow */
                    filter: drop-shadow(0 0 8px var(--ai-glow-inner)); /* Inner sparkle glow */
                    transition: filter 0.3s ease-in-out;
                }
                .ai-path-center-spark {
                    fill: var(--ai-button-core);
                    filter: drop-shadow(0 0 10px var(--ai-glow-inner));
                    opacity: 0; /* Hidden by default */
                    animation: spark-fade-in-out 3s linear infinite; /* Subtle sparkle */
                }


                /* --- Keyframe Animations --- */

                @keyframes initial-power-on {
                    0% { opacity: 0; transform: translateY(20px) scale(0.5); filter: drop-shadow(0 0 0 transparent); }
                    50% { opacity: 0.5; transform: translateY(-5px) scale(1.1); filter: drop-shadow(0 0 10px var(--ai-glow-outer)); }
                    100% { opacity: 1; transform: translateY(0px) scale(1); filter: drop-shadow(0 0 10px var(--ai-glow-outer)); }
                }

                @keyframes subtle-hum {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.01); }
                }

                @keyframes neon-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-3px) rotate(1deg); }
                    50% { transform: translateY(-6px) rotate(-1deg); }
                    75% { transform: translateY(-3px) rotate(0.5deg); }
                }
                @keyframes pulse-glow {
                    0% { filter: drop-shadow(0 0 8px var(--ai-glow-outer)); }
                    100% { filter: drop-shadow(0 0 18px var(--ai-glow-outer)); }
                }
                @keyframes drag-jolt {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1) rotate(5deg); }
                    100% { transform: scale(1.1); }
                }
                @keyframes spark-fade-in-out {
                    0% { opacity: 0; transform: scale(0.5); }
                    20% { opacity: 1; transform: scale(1); }
                    80% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.5); }
                }

                /* Hover state specific glows */
                .ai-button-container-fixed.hover .ai-path-inner-glow {
                    filter: drop-shadow(0 0 12px var(--ai-glow-inner));
                }
                .ai-button-container-fixed.hover .ai-path-center-spark {
                    opacity: 1; /* Make spark visible on hover */
                    animation: spark-fade-in-out 1s linear infinite; /* Faster spark on hover */
                }


                /* Mobile responsiveness */
                @media (max-width: 767px) {
                    .ai-button-container-fixed {
                        width: ${BUTTON_WIDTH_MOBILE}px;
                        height: ${BUTTON_HEIGHT_MOBILE}px;
                    }
                }
            `}</style>
            <div
                ref={buttonRef}
                className={`ai-button-container-fixed ${isDragging ? 'dragging' : ''} ${animationState} ${isPoweredOn ? '' : 'powered-off'}`}
                style={{ top: `${position.top}px`, left: `${position.left}px` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <svg className="ai-button-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="var(--ai-button-core)" />
                            <stop offset="100%" stopColor="var(--ai-button-accent)" />
                        </radialGradient>
                    </defs>
                    
                    {/* Outer flowing shape - a rounded rectangle or abstract blob */}
                    <rect x="15" y="15" width="70" height="70" rx="25" ry="25" fill="url(#coreGradient)" opacity="0.4" />
                    <rect x="20" y="20" width="60" height="60" rx="20" ry="20" fill="url(#coreGradient)" opacity="0.6" />

                    {/* Inner core shape - slightly brighter, more defined */}
                    <circle cx="50" cy="50" r="25" className="ai-path-inner-glow" />

                    {/* Central spark/glint - animated to fade in and out */}
                    <circle cx="50" cy="50" r="5" className="ai-path-center-spark" />
                    <path
                        className="ai-path-center-spark"
                        d="M50 40 L55 50 L50 60 L45 50 Z" /* Simple diamond for spark */
                        transform="rotate(45 50 50)"
                    />
                </svg>
            </div>
        </>
    );
};

export default AIEtherealCoreButton;