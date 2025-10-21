import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AnimatedRobot.css';

const AnimatedRobot = ({ onClick }) => {
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 52 : 60;
    const margin = 30;

    // --- Initial bottom-right position ---
    const [position, setPosition] = useState({
        x: window.innerWidth - size - margin,
        y: window.innerHeight - size - margin,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Track initial drag start pos to detect click vs drag
    const startPosRef = useRef({ x: 0, y: 0 });
    const draggedRef = useRef(false);

    // --- DRAG START ---
    const handleDragStart = useCallback(
        (e) => {
            e.preventDefault();
            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

            setIsDragging(true);
            setOffset({ x: clientX - position.x, y: clientY - position.y });
            startPosRef.current = { x: clientX, y: clientY };
            draggedRef.current = false;
        },
        [position]
    );

    // --- DRAG MOVE ---
    const handleDragMove = useCallback(
        (e) => {
            if (!isDragging) return;
            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

            const dx = clientX - startPosRef.current.x;
            const dy = clientY - startPosRef.current.y;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                draggedRef.current = true;
            }

            setPosition({
                x: clientX - offset.x,
                y: clientY - offset.y,
            });
        },
        [isDragging, offset]
    );

    // --- DRAG END ---
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // --- Attach / Detach listeners ---
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
        } else {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // --- Handle Click (only if not dragged) ---
    const handleClick = (e) => {
        if (!draggedRef.current) {
            onClick?.(e);
        }
    };

    // --- Styles ---
    const buttonStyle = {
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <button
            className="floating-chat-button"
            style={buttonStyle}
            onClick={handleClick}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
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
