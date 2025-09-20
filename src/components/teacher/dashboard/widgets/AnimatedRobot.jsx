import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AnimatedRobot.css'; // Import the dedicated CSS file

const AnimatedRobot = ({ onClick }) => {
    const buttonRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });

    // --- DIMENSIONS ---
    const BUTTON_WIDTH_DESKTOP = 60;
    const BUTTON_HEIGHT_DESKTOP = 60;
    const BUTTON_WIDTH_MOBILE = 52;
    const BUTTON_HEIGHT_MOBILE = 52;

    const getButtonDimensions = useCallback(() => {
        return window.innerWidth <= 768
            ? { width: BUTTON_WIDTH_MOBILE, height: BUTTON_HEIGHT_MOBILE }
            : { width: BUTTON_WIDTH_DESKTOP, height: BUTTON_HEIGHT_DESKTOP };
    }, []);

    const getInitialPosition = useCallback(() => {
        const { width, height } = getButtonDimensions();
        // FIXED: Increased bottom margin to prevent overlap with docks
        const margin = window.innerWidth <= 768 ? 80 : 90;
        return {
            top: window.innerHeight - height - margin,
            left: window.innerWidth - width - (margin / 2), // Also adjust horizontal margin slightly
        };
    }, [getButtonDimensions]);
    
    // --- POSITIONING & DRAG LOGIC ---
    useEffect(() => {
        setPosition(getInitialPosition());
    }, [getInitialPosition]);

    const handleInteractionStart = useCallback((clientX, clientY) => {
        if (!buttonRef.current) return;
        
        dragStartRef.current = { x: clientX, y: clientY };
        const rect = buttonRef.current.getBoundingClientRect();
        setOffset({
            x: clientX - rect.left,
            y: clientY - rect.top,
        });
        setIsDragging(true);
    }, []);

    const handleClick = useCallback((e) => {
        const currentX = e.clientX || dragStartRef.current.x;
        const currentY = e.clientY || dragStartRef.current.y;
        
        const dx = Math.abs(currentX - dragStartRef.current.x);
        const dy = Math.abs(currentY - dragStartRef.current.y);

        if (dx < 5 && dy < 5) {
            onClick(e);
        }
    }, [onClick]);

    // --- EVENT HANDLERS ---
    const handleMouseDown = (e) => handleInteractionStart(e.clientX, e.clientY);
    const handleTouchStart = (e) => {
        if (e.touches.length > 0) handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    // New, more robust useEffect for handling drag listeners
    useEffect(() => {
        // These functions are defined inside the effect, so they always have the latest state.
        const handleMouseMove = (e) => {
            const newLeft = e.clientX - offset.x;
            const newTop = e.clientY - offset.y;
            const { width, height } = getButtonDimensions();
            
            const boundedLeft = Math.min(Math.max(0, newLeft), window.innerWidth - width);
            const boundedTop = Math.min(Math.max(0, newTop), window.innerHeight - height);
            
            setPosition({ top: boundedTop, left: boundedLeft });
        };
        
        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                handleMouseMove(e.touches[0]);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        // Only add the 'move' and 'up' listeners when we are actually dragging.
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleMouseUp);
        }

        // The cleanup function will remove the listeners when dragging stops.
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, offset, getButtonDimensions]); // Effect depends on these values

    useEffect(() => {
        const handleResize = () => setPosition(getInitialPosition());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getInitialPosition]);

    const buttonClasses = `floating-chat-button ${isDragging ? 'dragging' : ''}`;

    const buttonStyle = {
        position: 'fixed',
        width: `${getButtonDimensions().width}px`,
        height: `${getButtonDimensions().height}px`,
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
            aria-label="Open AI Chat"
        >
            <div className="aurora-background" />
            <div className="button-content">
                <img
                    src="https://i.ibb.co/Y4WNBnxS/ai-girl.png"
                    alt="Chatbot"
                    className="floating-icon-image"
                />
            </div>
        </button>
    );
};

export default AnimatedRobot;