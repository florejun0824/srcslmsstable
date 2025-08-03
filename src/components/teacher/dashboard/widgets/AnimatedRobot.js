import React, { useState, useEffect, useRef, useCallback } from 'react';

const AnimatedRobot = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const robotRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartedAt = useRef({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [eyePosition, setEyePosition] = useState({ left: 0, top: 0 });

    const ROBOT_WIDTH_DESKTOP = 40;
    const ROBOT_HEIGHT_DESKTOP = 50;
    const ROBOT_WIDTH_MOBILE = 30; // Even smaller for mobile
    const ROBOT_HEIGHT_MOBILE = 40; // Even smaller for mobile

    const getCurrentRobotDimensions = useCallback(() => {
        return window.innerWidth < 768
            ? { width: ROBOT_WIDTH_MOBILE, height: ROBOT_HEIGHT_MOBILE }
            : { width: ROBOT_WIDTH_DESKTOP, height: ROBOT_HEIGHT_DESKTOP };
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
            const delay = Math.random() * 5000 + 3000; // Longer, more natural idle
            timeoutId = setTimeout(() => {
                const animations = ['blink', 'look-left', 'look-right', 'tilt-left', 'tilt-right', 'idle', '']; // Added empty string for brief stillness
                const nextAnimation = animations[Math.floor(Math.random() * animations.length)];
                setAnimationState(nextAnimation);
                // Clear animation state after a short duration if it's not idle/blink
                if (nextAnimation !== 'idle' && nextAnimation !== 'blink' && nextAnimation !== '') {
                    setTimeout(() => setAnimationState(''), 1000); // Shorter active animation duration
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
            const { width: currentRobotWidth, height: currentRobotHeight } = getCurrentRobotDimensions();
            const mobileNavHeight = window.innerWidth < 768 ? 60 : 0; // Assuming a 60px mobile nav

            let initialLeft = window.innerWidth - currentRobotWidth - 30; // More padding from right
            let initialTop = window.innerHeight - currentRobotHeight - 30 - mobileNavHeight; // More padding from bottom

            initialLeft = Math.max(0, Math.min(initialLeft, window.innerWidth - currentRobotWidth));
            initialTop = Math.max(0, Math.min(initialTop, window.innerHeight - currentRobotHeight - mobileNavHeight));

            setPosition({ left: initialLeft, top: initialTop });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getCurrentRobotDimensions]);

    // Mouse tracking for eyes
    const handleMouseMoveGlobal = useCallback((e) => {
        if (!isHovered || !robotRef.current) return;

        const robotRect = robotRef.current.getBoundingClientRect();
        const robotCenterX = robotRect.left + robotRect.width / 2;
        const robotCenterY = robotRect.top + robotRect.height / 2;

        const dx = e.clientX - robotCenterX;
        const dy = e.clientY - robotCenterY;

        // Normalize distance to avoid extreme eye movements
        const maxEyeMove = 2; // Max pixels the pupil can move
        const angle = Math.atan2(dy, dx);
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 100); // Cap distance influence

        setEyePosition({
            left: Math.cos(angle) * (distance / 100) * maxEyeMove,
            top: Math.sin(angle) * (distance / 100) * maxEyeMove,
        });
    }, [isHovered]);

    useEffect(() => {
        if (isHovered) {
            window.addEventListener('mousemove', handleMouseMoveGlobal);
        } else {
            setEyePosition({ left: 0, top: 0 }); // Reset eyes when not hovered
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
        };
    }, [isHovered, handleMouseMoveGlobal]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        setAnimationState('hover'); // Add a specific hover animation state
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        setAnimationState('idle'); // Revert to idle
    }, []);

    // Dragging logic
    const handleMouseDown = useCallback((e) => {
        if (robotRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.clientX, y: e.clientY };
            const bbox = robotRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - bbox.left, y: e.clientY - bbox.top });
            setAnimationState('drag-start'); // Animation for drag start
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const { width: currentRobotWidth, height: currentRobotHeight } = getCurrentRobotDimensions();
        const newLeft = e.clientX - offset.x;
        const newTop = e.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const mobileNavHeight = (viewportWidth < 768) ? 60 : 0;

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - currentRobotWidth;
        const maxTop = viewportHeight - currentRobotHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
    }, [isDragging, offset, getCurrentRobotDimensions]);

    const handleMouseUp = useCallback((e) => {
        setIsDragging(false);
        setAnimationState('idle'); // Return to idle after drag
        const movedX = Math.abs(e.clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.clientY - dragStartedAt.current.y);
        if (movedX < 5 && movedY < 5) {
            onClick(); // Trigger click if barely moved
        }
        e.stopPropagation();
    }, [onClick]);

    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1 && robotRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            const touch = e.touches[0];
            const bbox = robotRef.current.getBoundingClientRect();
            setOffset({ x: touch.clientX - bbox.left, y: touch.clientY - bbox.top });
            setAnimationState('drag-start');
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const { width: currentRobotWidth, height: currentRobotHeight } = getCurrentRobotDimensions();
        const touch = e.touches[0];
        const newLeft = touch.clientX - offset.x;
        const newTop = touch.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const mobileNavHeight = 60;

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - currentRobotWidth;
        const maxTop = viewportHeight - currentRobotHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
        e.preventDefault();
    }, [isDragging, offset, getCurrentRobotDimensions]);

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

    const { width: currentRobotWidth, height: currentRobotHeight } = getCurrentRobotDimensions();

    return (
        <>
            <style jsx>{`
                /* Base variables for easy scaling and theming */
                :root {
                    --robot-primary-blue: #3b82f6; /* Core blue */
                    --robot-secondary-blue: #60a5fa; /* Lighter blue */
                    --robot-dark-blue: #1e40af; /* Darkest blue for outlines/details */
                    --robot-neon-cyan: #a5f3fc; /* Brightest glow */
                    --robot-neon-cyan-glow: #22d3ee; /* Secondary glow color */
                    --robot-eye-color: #a5f3fc;
                    --robot-eye-glow: #67e8f9;
                    --robot-shadow-alpha: 0.7; /* Opacity for overall glow */
                }

                /* Container for the robot, fixed position */
                .robot-container-fixed {
                    position: fixed;
                    width: ${ROBOT_WIDTH_DESKTOP}px; /* Default desktop size */
                    height: ${ROBOT_HEIGHT_DESKTOP}px; /* Default desktop size */
                    z-index: 1000;
                    cursor: grab;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    /* Overall subtle glow and animation */
                    filter: drop-shadow(0 0 10px rgba(var(--robot-primary-blue), var(--robot-shadow-alpha)));
                    will-change: top, left, transform, filter;
                    animation:
                        neon-float 5s ease-in-out infinite,
                        pulse-glow 3s linear infinite alternate,
                        initial-power-on 1.5s ease-out forwards; /* New power-on animation */
                    transition: transform 0.3s ease-in-out, filter 0.3s ease-in-out;
                }
                .robot-container-fixed.dragging {
                    cursor: grabbing;
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 15px rgba(var(--robot-primary-blue), 0.9));
                    animation: none; /* Pause idle animations when dragging */
                }
                .robot-container-fixed.drag-start {
                    animation: drag-jolt 0.3s ease-out; /* Short jolt on drag start */
                }
                .robot-container-fixed.hover .robot {
                    transform: scale(1.05); /* Slightly bigger on hover */
                }
                .robot-container-fixed.powered-off {
                    opacity: 0;
                    transform: translateY(20px) scale(0.5);
                    filter: drop-shadow(0 0 0 transparent);
                }

                /* Inner robot structure */
                .robot {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform: scale(0.9); /* Slight internal scale */
                    transition: transform 0.3s ease-out;
                    transform-style: preserve-3d; /* For more complex rotations */
                    animation: subtle-hum 4s ease-in-out infinite alternate; /* New humming animation */
                }

                /* Head component */
                .head {
                    width: 80%; /* Relative to robot size */
                    height: 60%;
                    background: radial-gradient(circle at 30% 30%, var(--robot-secondary-blue) 0%, var(--robot-primary-blue) 100%);
                    border-radius: 50% 50% 10% 10%;
                    position: absolute;
                    left: 10%;
                    top: 15%;
                    border: 1px solid var(--robot-dark-blue);
                    box-shadow:
                        inset 0 3px 6px rgba(0,0,0,0.2),
                        0 0 10px rgba(var(--robot-primary-blue), 0.5),
                        0 0 20px rgba(var(--robot-primary-blue), 0.3);
                    z-index: 10;
                    transition: transform 0.4s ease-in-out;
                    transform-origin: bottom center; /* For tilt animations */
                }
                .head::before { /* Inner circuitry glow */
                    content: '';
                    position: absolute;
                    width: 70%;
                    height: 50%;
                    border: 1px solid rgba(var(--robot-neon-cyan), 0.5);
                    border-radius: 50%;
                    top: 15%;
                    left: 15%;
                    box-shadow: 0 0 10px var(--robot-neon-cyan-glow), inset 0 0 5px var(--robot-neon-cyan);
                    filter: blur(1px);
                    opacity: 0.3;
                }

                /* Body component */
                .body {
                    width: 100%;
                    height: 55%;
                    background: linear-gradient(135deg, var(--robot-secondary-blue), var(--robot-primary-blue));
                    position: absolute;
                    bottom: 0px;
                    border-radius: 10% 10% 50% 50%;
                    border: 1px solid var(--robot-dark-blue);
                    box-shadow:
                        inset 0 -3px 6px rgba(0,0,0,0.2),
                        0 0 10px rgba(var(--robot-primary-blue), 0.5),
                        0 0 20px rgba(var(--robot-primary-blue), 0.3);
                    overflow: hidden; /* Contains internal glow effects */
                }
                .body::before { /* Internal energy flow */
                    content: '';
                    position: absolute;
                    width: 120%;
                    height: 120%;
                    top: -10%;
                    left: -10%;
                    background: conic-gradient(from 0deg at 50% 50%, transparent 0%, var(--robot-neon-cyan) 10%, transparent 20%, transparent 100%);
                    filter: blur(5px);
                    animation: energy-flow 3s linear infinite;
                    opacity: 0.1;
                }


                /* Neck component */
                .neck {
                    width: 30%;
                    height: 12%;
                    background: var(--robot-dark-blue);
                    position: absolute;
                    top: 55%; /* Connects head to body */
                    left: 35%;
                    z-index: 5;
                    border-radius: 3px;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
                }

                /* Central panel on body */
                .panel {
                    width: 25%;
                    height: 8%;
                    background: var(--robot-neon-cyan);
                    border-radius: 2px;
                    position: absolute;
                    top: 25%;
                    left: 50%;
                    transform: translateX(-50%);
                    box-shadow: 0 0 8px var(--robot-neon-cyan-glow), 0 0 15px rgba(var(--robot-neon-cyan), 0.5);
                    animation: panel-pulse 2s infinite ease-in-out;
                }

                /* Antenna */
                .antenna {
                    width: 8%;
                    height: 35%;
                    background: var(--robot-dark-blue);
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: -5%; /* Extends above head */
                    border-radius: 2px 2px 0 0;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
                }
                .antenna::before, .antenna::after { /* Antenna segments/nodes */
                    content: '';
                    width: 100%;
                    height: 20%;
                    background: var(--robot-dark-blue);
                    position: absolute;
                    left: 0;
                    border-radius: 2px;
                    box-shadow: 0 0 5px var(--robot-neon-cyan-glow);
                }
                .antenna::before { top: 25%; animation: antenna-segment-glow 2s infinite alternate ease-in-out; }
                .antenna::after { top: 50%; animation: antenna-segment-glow 2s infinite alternate ease-in-out 0.5s; } /* Staggered glow */

                .antenna-tip { /* Glowing tip of antenna */
                    width: 20%;
                    height: 20%;
                    background: var(--robot-neon-cyan);
                    border-radius: 50%;
                    position: absolute;
                    top: -10%;
                    left: 40%;
                    animation: antenna-glow 2.5s infinite;
                    border: 1px solid var(--robot-neon-cyan-glow);
                    box-shadow: 0 0 10px var(--robot-neon-cyan), 0 0 20px var(--robot-neon-cyan-glow);
                }

                /* Eye sockets and pupils */
                .eye-socket {
                    position: absolute;
                    top: 40%;
                    width: 25%;
                    height: 25%;
                    background: var(--robot-dark-blue);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
                    overflow: hidden; /* Keep pupil within socket */
                }
                .eye-socket.left { left: 18%; }
                .eye-socket.right { right: 18%; }

                .pupil {
                    width: 50%;
                    height: 50%;
                    background-color: var(--robot-eye-color);
                    border-radius: 50%;
                    box-shadow: 0 0 5px var(--robot-eye-color), 0 0 10px var(--robot-eye-glow);
                    transition: transform 0.1s ease-out; /* Faster eye tracking */
                    position: relative;
                }
                .pupil-glint {
                    width: 30%;
                    height: 30%;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 10%;
                    left: 10%;
                    filter: blur(0.5px);
                }

                /* Animation states */
                .tilt-left .head { transform: rotate(-8deg); }
                .tilt-right .head { transform: rotate(8deg); }
                .blink .pupil { animation: blink-animation 0.4s; }
                .look-left .pupil { transform: translateX(-${eyePosition.left}px) translateY(${eyePosition.top}px); }
                .look-right .pupil { transform: translateX(${eyePosition.left}px) translateY(${eyePosition.top}px); }
                .hover .pupil { transform: translateX(${eyePosition.left}px) translateY(${eyePosition.top}px); }

                /* CSS Particle Effect (Floating Wisps) */
                .robot::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    box-shadow:
                        /* Create multiple "particles" with varying offsets and blurs */
                        10px 15px 5px var(--robot-neon-cyan-glow),
                        -5px 20px 8px var(--robot-neon-cyan),
                        20px -10px 3px var(--robot-eye-color),
                        -15px -15px 7px var(--robot-neon-cyan-glow);
                    animation: float-wisps 10s linear infinite;
                    filter: blur(1px);
                    opacity: 0.1;
                    pointer-events: none;
                }


                /* --- Keyframe Animations --- */

                @keyframes initial-power-on {
                    0% { opacity: 0; transform: translateY(20px) scale(0.5); filter: drop-shadow(0 0 0 transparent); }
                    50% { opacity: 0.5; transform: translateY(-5px) scale(1.1); filter: drop-shadow(0 0 10px rgba(var(--robot-primary-blue), 0.7)); }
                    100% { opacity: 1; transform: translateY(0px) scale(1); filter: drop-shadow(0 0 10px rgba(var(--robot-primary-blue), var(--robot-shadow-alpha))); }
                }

                @keyframes subtle-hum {
                    0%, 100% { transform: scale(0.9); }
                    50% { transform: scale(0.91); }
                }

                @keyframes neon-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-3px) rotate(1deg); }
                    50% { transform: translateY(-6px) rotate(-1deg); }
                    75% { transform: translateY(-3px) rotate(0.5deg); }
                }
                @keyframes pulse-glow {
                    0% { filter: drop-shadow(0 0 8px rgba(var(--robot-primary-blue), 0.4)); }
                    100% { filter: drop-shadow(0 0 15px rgba(var(--robot-primary-blue), 0.8)); }
                }
                @keyframes antenna-glow {
                    0%, 100% { box-shadow: 0 0 8px var(--robot-neon-cyan); }
                    50% { box-shadow: 0 0 18px var(--robot-neon-cyan-glow), 0 0 8px var(--robot-neon-cyan); }
                }
                @keyframes antenna-segment-glow {
                    0%, 100% { box-shadow: 0 0 5px var(--robot-neon-cyan-glow), inset 0 0 2px var(--robot-neon-cyan); opacity: 0.7;}
                    50% { box-shadow: 0 0 12px var(--robot-neon-cyan-glow), inset 0 0 4px var(--robot-neon-cyan); opacity: 1;}
                }
                @keyframes panel-pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                @keyframes blink-animation {
                    0% { transform: scaleY(1); }
                    10% { transform: scaleY(0.1); }
                    20% { transform: scaleY(1); }
                    100% { transform: scaleY(1); }
                }
                @keyframes drag-jolt {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1) rotate(5deg); }
                    100% { transform: scale(1.1); }
                }
                @keyframes energy-flow {
                    0% { transform: rotate(0deg); opacity: 0.1; }
                    50% { opacity: 0.2; }
                    100% { transform: rotate(360deg); opacity: 0.1; }
                }
                @keyframes float-wisps {
                    0% { transform: translate(0, 0) scale(1); opacity: 0.1; }
                    25% { transform: translate(10px, -15px) scale(1.2); opacity: 0.15; }
                    50% { transform: translate(20px, 0px) scale(0.9); opacity: 0.1; }
                    75% { transform: translate(10px, 15px) scale(1.1); opacity: 0.15; }
                    100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
                }

                /* Mobile responsiveness */
                @media (max-width: 767px) {
                    .robot-container-fixed {
                        width: ${ROBOT_WIDTH_MOBILE}px;
                        height: ${ROBOT_HEIGHT_MOBILE}px;
                    }
                    .head { top: 12%; } /* Adjust top for smaller head */
                    .neck { top: 50%; } /* Adjust neck position */
                    .antenna { top: -8%; } /* Adjust antenna position */
                    .panel { top: 20%; } /* Adjust panel position */
                    .eye-socket { top: 35%; } /* Adjust eye position */
                }
            `}</style>
            <div
                ref={robotRef}
                className={`robot-container-fixed ${isDragging ? 'dragging' : ''} ${animationState} ${isPoweredOn ? '' : 'powered-off'}`}
                style={{ top: `${position.top}px`, left: `${position.left}px` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className={`robot ${animationState}`}>
                    <div className="antenna">
                        <div className="antenna-tip"></div>
                    </div>
                    <div className="head">
                        <div className="eye-socket left">
                            <div className="pupil" style={{ transform: `translateX(${eyePosition.left}px) translateY(${eyePosition.top}px)` }}>
                                <div className="pupil-glint"></div>
                            </div>
                        </div>
                        <div className="eye-socket right">
                            <div className="pupil" style={{ transform: `translateX(${eyePosition.left}px) translateY(${eyePosition.top}px)` }}>
                                <div className="pupil-glint"></div>
                            </div>
                        </div>
                    </div>
                    <div className="neck"></div>
                    <div className="body">
                        <div className="panel"></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AnimatedRobot;