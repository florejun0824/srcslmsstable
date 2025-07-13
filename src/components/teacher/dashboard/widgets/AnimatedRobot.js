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
            const currentRobotWidth = window.innerWidth < 768 ? 50 : 70;
            const currentRobotHeight = window.innerWidth < 768 ? 65 : 90;
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
        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : (window.innerWidth < 768 ? 50 : 70);
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : (window.innerWidth < 768 ? 65 : 90);
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
        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : 50;
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : 65;
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
                .robot-container-fixed {
                    position: fixed;
                    width: 70px;
                    height: 90px;
                    animation: robot-float 5s ease-in-out infinite;
                    z-index: 1000;
                    cursor: grab;
                    background-color: rgba(255, 255, 255, 0.7);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: box-shadow 0.3s ease-in-out;
                    will-change: top, left;
                }
                .robot-container-fixed.dragging {
                    cursor: grabbing;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                }
                .robot { position: relative; width: 100%; height: 100%; }
                .head { width: 60px; height: 50px; background-image: linear-gradient(to bottom, #d1d5db, #9ca3af); border-radius: 50% 50% 10px 10px; position: absolute; left: 5px; top: 10px; border: 2px solid #6b7280; z-index: 10; transition: transform 0.4s ease-in-out; }
                .body { width: 70px; height: 55px; background-image: linear-gradient(to bottom, #e5e7eb, #b3b9c4); position: absolute; bottom: 10px; border-radius: 10px 10px 50% 50%; border: 2px solid #9ca3af; }
                .neck { width: 20px; height: 8px; background: #9ca3af; position: absolute; top: 58px; left: 25px; z-index: 5; }
                .panel { width: 15px; height: 5px; background: #4fe0f0; border-radius: 2px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 5px #4fe0f0; animation: panel-pulse 3s infinite ease-in-out; }
                .antenna { width: 3px; height: 20px; background: #9ca3af; position: absolute; left: 50%; transform: translateX(-50%); top: -5px; }
                .antenna::after { content: ''; width: 10px; height: 10px; background: #22d3ee; border-radius: 50%; position: absolute; top: -5px; left: -3.5px; animation: antenna-glow 2.5s infinite; }
                .eye-socket { position: absolute; top: 22px; width: 14px; height: 14px; background: #374151; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
                .eye-socket.left { left: 12px; }
                .eye-socket.right { right: 12px; }
                .pupil { width: 5px; height: 5px; background: #22d3ee; border-radius: 50%; box-shadow: 0 0 3px #67e8f9; transition: transform 0.3s ease-out; }
                .pupil-glint { width: 2px; height: 2px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; }
                .tilt-left .head { transform: rotate(-8deg); }
                .tilt-right .head { transform: rotate(8deg); }
                .blink .pupil { animation: blink-animation 0.4s; }
                .look-left .pupil { transform: translateX(-2px); }
                .look-right .pupil { transform: translateX(2px); }
                @keyframes robot-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes antenna-glow { 0% { box-shadow: 0 0 8px #67e8f9; } 50% { box-shadow: 0 0 18px #a5f3fd, 0 0 8px #67e8f9; } 100% { box-shadow: 0 0 8px #67e8f9; } }
                @keyframes panel-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
                @keyframes blink-animation { 0% { transform: scaleY(1); } 5% { transform: scaleY(0.1); } 10% { transform: scaleY(1); } 100% { transform: scaleY(1); } }
                @media (max-width: 767px) {
                    .robot-container-fixed { width: 50px; height: 65px; }
                    .robot .head { width: 40px; height: 35px; left: 5px; top: 8px; }
                    .robot .body { width: 50px; height: 40px; bottom: 8px; }
                    .robot .neck { width: 15px; height: 6px; top: 42px; left: 17.5px; }
                    .robot .eye-socket { width: 10px; height: 10px; top: 15px; }
                    .robot .eye-socket.left { left: 8px; }
                    .robot .eye-socket.right { right: 8px; }
                    .robot .pupil { width: 4px; height: 4px; }
                    .robot .pupil-glint { width: 1px; height: 1px; }
                    .robot .panel { width: 10px; height: 4px; }
                    .robot .antenna { height: 15px; }
                    .robot .antenna::after { width: 8px; height: 8px; top: -4px; left: -2.5px; }
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