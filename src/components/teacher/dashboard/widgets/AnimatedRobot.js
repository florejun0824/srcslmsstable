import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AnimatedRobot.css';
import { CSSTransition } from 'react-transition-group';

const AnimatedRobot = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const buttonRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartedAt = useRef({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Define dimensions for the button
    const BUTTON_WIDTH_DESKTOP = 80;
    const BUTTON_HEIGHT_DESKTOP = 80;
    const BUTTON_WIDTH_MOBILE = 65;
    const BUTTON_HEIGHT_MOBILE = 65;

    const getCurrentButtonDimensions = useCallback(() => {
        return window.innerWidth <= 768
            ? { width: BUTTON_WIDTH_MOBILE, height: BUTTON_HEIGHT_MOBILE }
            : { width: BUTTON_WIDTH_DESKTOP, height: BUTTON_HEIGHT_DESKTOP };
    }, [BUTTON_WIDTH_DESKTOP, BUTTON_HEIGHT_DESKTOP, BUTTON_WIDTH_MOBILE, BUTTON_HEIGHT_MOBILE]);

    const getInitialPosition = useCallback(() => {
        const { width, height } = getCurrentButtonDimensions();
        return {
            top: window.innerHeight - height - 40,
            left: window.innerWidth - width - 40,
        };
    }, [getCurrentButtonDimensions]);

    useEffect(() => {
        setPosition(getInitialPosition());
    }, [getInitialPosition]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (buttonRef.current) {
                const { left, top } = buttonRef.current.getBoundingClientRect();
                setPosition({ left, top });
            }
        }
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (buttonRef.current) {
                const { left, top } = buttonRef.current.getBoundingClientRect();
                setPosition({ left, top });
            }
        }
    }, [isDragging]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !buttonRef.current) return;
        e.preventDefault();
        const { width, height } = getCurrentButtonDimensions();
        const newLeft = e.clientX - offset.x;
        const newTop = e.clientY - offset.y;
        const boundedLeft = Math.min(Math.max(0, newLeft), window.innerWidth - width);
        const boundedTop = Math.min(Math.max(0, newTop), window.innerHeight - height);
        setPosition({ top: boundedTop, left: boundedLeft });
    }, [isDragging, offset, getCurrentButtonDimensions]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || !buttonRef.current || e.touches.length === 0) return;
        e.preventDefault();
        const touch = e.touches[0];
        const { width, height } = getCurrentButtonDimensions();
        const newLeft = touch.clientX - offset.x;
        const newTop = touch.clientY - offset.y;
        const boundedLeft = Math.min(Math.max(0, newLeft), window.innerWidth - width);
        const boundedTop = Math.min(Math.max(0, newTop), window.innerHeight - height);
        setPosition({ top: boundedTop, left: boundedLeft });
    }, [isDragging, offset, getCurrentButtonDimensions]);

    const handleMouseDown = useCallback((e) => {
        if (buttonRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.clientX, y: e.clientY };
            const rect = buttonRef.current.getBoundingClientRect();
            setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    }, []);

    const handleTouchStart = useCallback((e) => {
        if (buttonRef.current && e.touches.length > 0) {
            const touch = e.touches[0];
            setIsDragging(true);
            dragStartedAt.current = { x: touch.clientX, y: touch.clientY };
            const rect = buttonRef.current.getBoundingClientRect();
            setOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
        }
    }, []);

    const handleClick = useCallback((e) => {
        if (isDragging) {
            e.stopPropagation();
            return;
        }

        const dx = Math.abs(e.clientX - dragStartedAt.current.x);
        const dy = Math.abs(e.clientY - dragStartedAt.current.y);

        if (dx < 5 && dy < 5) {
            onClick(e);
            setAnimationState('click');
            setTimeout(() => setAnimationState('idle'), 500); // Reset animation state
        }
    }, [isDragging, onClick]);

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

    // Handle initial position on window resize
    useEffect(() => {
        const handleResize = () => {
            setPosition(getInitialPosition());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getInitialPosition]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        setAnimationState('hover');
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setAnimationState('idle');
    };

    return (
        <button
            ref={buttonRef}
            className={`floating-chat-button ${animationState} ${isHovered ? 'hover' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: isDragging ? 'none' : 'translate(0, 0)',
                cursor: isDragging ? 'grabbing' : 'pointer',
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
        >
            <div className="button-content">
                <img src="https://i.ibb.co/x8PrqMXN/chatbot-2.png" alt="Chatbot" className="floating-icon-image" />
            </div>
        </button>
    );
};

export default AnimatedRobot;