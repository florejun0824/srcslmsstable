// src/components/teacher/AnimatedRobot.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AnimatedRobot.css';

const AnimatedRobot = ({ onClick }) => {
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 52 : 60;
    
    // --- MODIFIED MARGINS ---
    const sideMargin = 30; // Original right margin
    const mobileBottomMargin = 64; // 6rem (4rem nav bar + 2rem spacing)
    const desktopBottomMargin = 30; // Original desktop margin

    // --- MODIFIED Initial position ---
    const [position, setPosition] = useState({
        x: window.innerWidth - size - sideMargin,
        y: window.innerHeight - size - (isMobile ? mobileBottomMargin : desktopBottomMargin),
    });
    // --- (Rest of the states are unchanged) ---
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const draggedRef = useRef(false);

    // --- DRAG START (Unchanged) ---
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

    // --- DRAG MOVE (Unchanged) ---
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

    // --- DRAG END (Unchanged) ---
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // --- Attach / Detach listeners (Unchanged) ---
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

    // --- Handle Click (Unchanged) ---
    const handleClick = (e) => {
        if (!draggedRef.current) {
            onClick?.(e);
        }
    };

    // --- MODIFIED Styles ---
    const buttonStyle = {
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: 52, // MODIFIED: Set to 52 (higher than nav bar's 51)
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