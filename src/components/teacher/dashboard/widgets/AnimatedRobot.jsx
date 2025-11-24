// src/components/teacher/dashboard/widgets/AnimatedRobot.jsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import Lottie from 'lottie-react'; 
import robotAnimation from '../../../../assets/robot.json'; 
import './AnimatedRobot.css';

const AnimatedRobot = ({ onClick }) => {
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 65 : 75; 
    
    const sideMargin = 30; 
    const mobileBottomMargin = 94; 
    const desktopBottomMargin = 30; 

    const [position, setPosition] = useState({
        x: window.innerWidth - size - sideMargin,
        y: window.innerHeight - size - (isMobile ? mobileBottomMargin : desktopBottomMargin),
    });

    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const draggedRef = useRef(false);

    const handleDragStart = useCallback(
        (e) => {
            // Only prevent default if it's not a touch event to avoid blocking scroll initiation issues
            if (e.type === 'mousedown') e.preventDefault();
            
            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

            setIsDragging(true);
            setOffset({ x: clientX - position.x, y: clientY - position.y });
            startPosRef.current = { x: clientX, y: clientY };
            draggedRef.current = false;
        },
        [position]
    );

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

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

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

    const handleClick = (e) => {
        if (!draggedRef.current) {
            onClick?.(e);
        }
    };

    const buttonStyle = {
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        // Force GPU layer for smoother rendering over scrolling content
        transform: `translate3d(0, 0, 0)`, 
        // Separate dragging visual logic from hardware acceleration
        transition: isDragging ? 'none' : 'transform 0.2s ease, top 0.1s, left 0.1s', 
        zIndex: 999, 
        cursor: isDragging ? 'grabbing' : 'grab',
        background: 'transparent',
        border: 'none',
        padding: 0,
        outline: 'none',
        // Hint to browser to optimize this element
        willChange: 'top, left'
    };

    return (
        <button
            className={`floating-chat-button ${isDragging ? 'dragging' : ''}`}
            style={buttonStyle}
            onClick={handleClick}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            aria-label="Open AI Chat"
        >
            <div className="button-content">
                <Lottie 
                    animationData={robotAnimation} 
                    loop={true} 
                    className="floating-lottie"
                />
            </div>
        </button>
    );
};

export default memo(AnimatedRobot);