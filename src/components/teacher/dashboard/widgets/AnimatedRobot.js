import React, { useState, useEffect, useRef, useCallback } from 'react';

const AnimatedRobot = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const robotRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartedAt = useRef({ x: 0, y: 0 });

    useEffect(() => {
        let timeoutId;
        const scheduleNextAnimation = () => {
            const delay = Math.random() * 4000 + 2000;
            timeoutId = setTimeout(() => {
                const animations = ['blink', 'look-left', 'look-right', 'tilt-left', 'tilt-right', 'idle'];
                const nextAnimation = animations[Math.floor(Math.random() * animations.length)];
                setAnimationState(nextAnimation);
                if (nextAnimation !== 'idle' && nextAnimation !== 'blink') {
                    setTimeout(() => setAnimationState(''), 1500);
                }
                scheduleNextAnimation();
            }, delay);
        };
        scheduleNextAnimation();
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const currentRobotWidth = window.innerWidth < 768 ? 40 : 60; // Smaller size
            const currentRobotHeight = window.innerWidth < 768 ? 50 : 75; // Smaller size
            const mobileNavHeight = 60;

            let initialLeft = window.innerWidth - currentRobotWidth - 20;
            let initialTop = window.innerHeight - currentRobotHeight - 20;

            if (window.innerWidth < 768) {
                initialTop = window.innerHeight - currentRobotHeight - mobileNavHeight - 20;
            }
            initialLeft = Math.max(0, Math.min(initialLeft, window.innerWidth - currentRobotWidth));
            initialTop = Math.max(0, Math.min(initialTop, window.innerHeight - currentRobotHeight - (window.innerWidth < 768 ? mobileNavHeight : 0)));

            setPosition({ left: initialLeft, top: initialTop });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (robotRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.clientX, y: e.clientY };
            const bbox = robotRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - bbox.left, y: e.clientY - bbox.top });
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const newLeft = e.clientX - offset.x;
        const newTop = e.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : (window.innerWidth < 768 ? 40 : 60);
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : (window.innerWidth < 768 ? 50 : 75);
        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - robotWidth;
        const mobileNavHeight = (viewportWidth < 768) ? 60 : 0;
        const maxTop = viewportHeight - robotHeight - mobileNavHeight;
        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
    }, [isDragging, offset]);

    const handleMouseUp = useCallback((e) => {
        setIsDragging(false);
        const movedX = Math.abs(e.clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.clientY - dragStartedAt.current.y);
        if (movedX < 5 && movedY < 5) {
            onClick();
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
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const newLeft = touch.clientX - offset.x;
        const newTop = touch.clientY - offset.y;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : 40;
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : 50;
        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - robotWidth;
        const mobileNavHeight = 60;
        const maxTop = viewportHeight - robotHeight - mobileNavHeight;
        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));
        setPosition({ left: boundedLeft, top: boundedTop });
        e.preventDefault();
    }, [isDragging, offset]);

    const handleTouchEnd = useCallback((e) => {
        setIsDragging(false);
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
                /* Glowing neon-style robot */
                .robot-container-fixed {
                    position: fixed;
                    width: 60px;
                    height: 75px;
                    z-index: 1000;
                    cursor: grab;
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
                    will-change: top, left;
                    animation: neon-float 5s ease-in-out infinite, pulse-glow 3s linear infinite alternate;
                    transition: transform 0.3s ease-in-out;
                }
                .robot-container-fixed.dragging {
                    cursor: grabbing;
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));
                }
                .robot {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform: scale(0.9);
                }
                .head {
                    width: 48px;
                    height: 40px;
                    background-color: #3b82f6; /* A more vibrant blue */
                    border-radius: 50% 50% 8px 8px;
                    position: absolute;
                    left: 6px;
                    top: 8px;
                    border: 2px solid #1e40af;
                    box-shadow: inset 0 3px 6px rgba(0,0,0,0.2), 0 0 15px rgba(59, 130, 246, 0.7);
                    z-index: 10;
                    transition: transform 0.4s ease-in-out;
                }
                .body {
                    width: 60px;
                    height: 45px;
                    background-color: #60a5fa; /* Lighter shade of blue */
                    position: absolute;
                    bottom: 0px;
                    border-radius: 8px 8px 50% 50%;
                    border: 2px solid #1e40af;
                    box-shadow: inset 0 -3px 6px rgba(0,0,0,0.2), 0 0 15px rgba(59, 130, 246, 0.7);
                }
                .neck {
                    width: 16px;
                    height: 6px;
                    background: #1e40af;
                    position: absolute;
                    top: 48px;
                    left: 22px;
                    z-index: 5;
                    border-radius: 3px;
                }
                .panel {
                    width: 12px;
                    height: 4px;
                    background: #a5f3fc; /* Neon cyan */
                    border-radius: 2px;
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    box-shadow: 0 0 8px #22d3ee;
                    animation: panel-pulse 2s infinite ease-in-out;
                }
                .antenna {
                    width: 3px;
                    height: 18px;
                    background: #1e40af;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 0px;
                    border-radius: 2px 2px 0 0;
                }
                .antenna::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    background: #a5f3fc;
                    border-radius: 50%;
                    position: absolute;
                    top: -4px;
                    left: -2.5px;
                    animation: antenna-glow 2.5s infinite;
                    border: 1px solid #22d3ee;
                }
                .eye-socket {
                    position: absolute;
                    top: 18px;
                    width: 12px;
                    height: 12px;
                    background: #1e40af;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
                }
                .eye-socket.left { left: 10px; }
                .eye-socket.right { right: 10px; }
                .pupil {
                    width: 6px;
                    height: 6px;
                    background-color: #a5f3fc;
                    border-radius: 50%;
                    box-shadow: 0 0 5px #a5f3fc, 0 0 10px #67e8f9;
                    transition: transform 0.3s ease-out;
                }
                .pupil-glint {
                    width: 2px;
                    height: 2px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 1px;
                    left: 1px;
                }
                .tilt-left .head { transform: rotate(-8deg); }
                .tilt-right .head { transform: rotate(8deg); }
                .blink .pupil { animation: blink-animation 0.4s; }
                .look-left .pupil { transform: translateX(-2px); }
                .look-right .pupil { transform: translateX(2px); }

                /* Glorious new animations */
                @keyframes neon-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-5px) rotate(2deg); }
                    50% { transform: translateY(-10px) rotate(-2deg); }
                    75% { transform: translateY(-5px) rotate(1deg); }
                }
                @keyframes pulse-glow {
                    0% { filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)); }
                    100% { filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8)); }
                }
                @keyframes antenna-glow {
                    0%, 100% { box-shadow: 0 0 8px #a5f3fc; }
                    50% { box-shadow: 0 0 18px #a5f3fc, 0 0 8px #a5f3fc; }
                }
                @keyframes panel-pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                @keyframes blink-animation {
                    0% { transform: scaleY(1); }
                    5% { transform: scaleY(0.1); }
                    10% { transform: scaleY(1); }
                    100% { transform: scaleY(1); }
                }

                @media (max-width: 767px) {
                    .robot-container-fixed { width: 40px; height: 50px; }
                    .robot .head { width: 32px; height: 28px; left: 4px; top: 6px; }
                    .robot .body { width: 40px; height: 35px; bottom: 0px; }
                    .robot .neck { width: 12px; height: 4px; top: 32px; left: 14px; }
                    .robot .eye-socket { width: 9px; height: 9px; top: 12px; }
                    .robot .eye-socket.left { left: 6px; }
                    .robot .eye-socket.right { right: 6px; }
                    .robot .pupil { width: 4px; height: 4px; }
                    .robot .pupil-glint { width: 1px; height: 1px; top: 1px; left: 1px;}
                    .robot .panel { width: 8px; height: 3px; }
                    .robot .antenna { height: 12px; }
                    .robot .antenna::after { width: 6px; height: 6px; top: -3px; left: -1.5px; }
                }
            `}</style>
            <div
                ref={robotRef}
                className={`robot-container-fixed ${isDragging ? 'dragging' : ''}`}
                style={{ top: `${position.top}px`, left: `${position.left}px` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className={`robot ${animationState}`}>
                    <div className="antenna"></div>
                    <div className="head">
                        <div className="eye-socket left"><div className="pupil"><div className="pupil-glint"></div></div></div>
                        <div className="eye-socket right"><div className="pupil"><div className="pupil-glint"></div></div></div>
                    </div>
                    <div className="neck"></div>
                    <div className="body"><div className="panel"></div></div>
                </div>
            </div>
        </>
    );
};

export default AnimatedRobot;