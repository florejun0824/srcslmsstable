import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AnimatedRobot.css'; // Import the dedicated CSS file

const AnimatedRobot = ({ onClick }) => {
    const buttonRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartedAt = useRef({ x: 0, y: 0 });

    // --- DIMENSIONS ---
    const BUTTON_WIDTH_DESKTOP = 80;
    const BUTTON_HEIGHT_DESKTOP = 80;
    const BUTTON_WIDTH_MOBILE = 65;
    const BUTTON_HEIGHT_MOBILE = 65;

    const getCurrentButtonDimensions = useCallback(() => {
        return window.innerWidth <= 768
            ? { width: BUTTON_WIDTH_MOBILE, height: BUTTON_HEIGHT_MOBILE }
            : { width: BUTTON_WIDTH_DESKTOP, height: BUTTON_HEIGHT_DESKTOP };
    }, []);

    const getInitialPosition = useCallback(() => {
        const { width, height } = getCurrentButtonDimensions();
        const margin = window.innerWidth <= 768 ? 20 : 40; // Smaller margin on mobile
        return {
            top: window.innerHeight - height - margin,
            left: window.innerWidth - width - margin,
        };
    }, [getCurrentButtonDimensions]);
    
    // --- POSITIONING & DRAG LOGIC ---
    useEffect(() => {
        setPosition(getInitialPosition());
    }, [getInitialPosition]);

    const handleInteractionEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
        }
    }, [isDragging]);

    const handleInteractionMove = useCallback((clientX, clientY) => {
        if (!isDragging || !buttonRef.current) return;
        const { width, height } = getCurrentButtonDimensions();
        const newLeft = clientX - offset.x;
        const newTop = clientY - offset.y;
        
        const boundedLeft = Math.min(Math.max(0, newLeft), window.innerWidth - width);
        const boundedTop = Math.min(Math.max(0, newTop), window.innerHeight - height);
        setPosition({ top: boundedTop, left: boundedLeft });
    }, [isDragging, offset, getCurrentButtonDimensions]);

    const handleInteractionStart = useCallback((clientX, clientY) => {
        if (buttonRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: clientX, y: clientY };
            const rect = buttonRef.current.getBoundingClientRect();
            setOffset({ x: clientX - rect.left, y: clientY - rect.top });
        }
    }, []);

    const handleClick = useCallback((e) => {
        const currentX = e.clientX || dragStartedAt.current.x;
        const currentY = e.clientY || dragStartedAt.current.y;
        
        const dx = Math.abs(currentX - dragStartedAt.current.x);
        const dy = Math.abs(currentY - dragStartedAt.current.y);

        // Only trigger click if it wasn't a significant drag
        if (dx < 5 && dy < 5) {
            onClick(e); // This now correctly calls the function from the parent
        }
    }, [onClick]);

    // --- EVENT HANDLERS ---
    const handleMouseDown = (e) => handleInteractionStart(e.clientX, e.clientY);
    const handleTouchStart = (e) => {
        if (e.touches.length > 0) handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleMouseMove = (e) => { e.preventDefault(); handleInteractionMove(e.clientX, e.clientY); };
    const handleTouchMove = (e) => { e.preventDefault(); if (e.touches.length > 0) handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY); };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleInteractionEnd);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, handleMouseMove, handleInteractionEnd, handleTouchMove]);

    useEffect(() => {
        const handleResize = () => setPosition(getInitialPosition());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getInitialPosition]);

    const buttonClasses = `floating-chat-button ${isDragging ? 'dragging' : ''}`;

    const buttonStyle = {
        position: 'fixed',
        width: `${window.innerWidth <= 768 ? BUTTON_WIDTH_MOBILE : BUTTON_WIDTH_DESKTOP}px`,
        height: `${window.innerWidth <= 768 ? BUTTON_HEIGHT_MOBILE : BUTTON_HEIGHT_DESKTOP}px`,
        top: `${position.top}px`,
        left: `${position.left}px`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease',
    };

    return (
        <button
            ref={buttonRef}
            className={buttonClasses}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={buttonStyle}
        >
            <div className="aurora-background" />
            <div className="button-content">
                <img
                    src="https://i.ibb.co/x8PrqMXN/chatbot-2.png"
                    alt="Chatbot"
                    className="floating-icon-image"
                />
            </div>
        </button>
    );
};

export default AnimatedRobot;