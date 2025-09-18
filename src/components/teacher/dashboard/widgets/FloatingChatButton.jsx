import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'; // Or FaCommentDots from react-icons/fa6

const FloatingChatButton = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const buttonRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Define dimensions for the button
    const BUTTON_SIZE_DESKTOP = 60;
    const BUTTON_SIZE_MOBILE = 50;

    const getCurrentButtonDimensions = useCallback(() => {
        return window.innerWidth < 768
            ? { width: BUTTON_SIZE_MOBILE, height: BUTTON_SIZE_MOBILE }
            : { width: BUTTON_SIZE_DESKTOP, height: BUTTON_SIZE_DESKTOP };
    }, []);

    // Initial power-on animation state
    const [isPoweredOn, setIsPoweredOn] = useState(false);

    // Sequence for power-on effect
    useEffect(() => {
        const powerOnTimer = setTimeout(() => {
            setIsPoweredOn(true);
        }, 500); // Give it a moment to appear before powering on
        return () => clearTimeout(powerOnTimer);
    }, []);


    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
            setAnimationState('activate');
            setTimeout(() => setAnimationState('idle'), 600); // Reset animation state
        }
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed bottom-4 right-4 z-[1001] rounded-full transition-all duration-300 transform
                        focus:outline-none focus:ring-4 focus:ring-indigo-500/50
                        ${isPoweredOn ? 'opacity-100 scale-100 animate-fadeInUp' : 'opacity-0 scale-0'}
                        ${isHovered ? 'shadow-lg' : 'shadow-md'}
                        ${animationState === 'activate' ? 'animate-pressEffect' : ''}
                        `}
            style={{
                width: `${getCurrentButtonDimensions().width}px`,
                height: `${getCurrentButtonDimensions().height}px`,
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', /* Vibrant gradient */
                overflow: 'hidden', /* For inner elements */
                border: 'none',
                cursor: 'pointer',
            }}
            title="Open Chat"
        >
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Main Icon */}
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-white relative z-10" />

                {/* Subtle pulsing glow around the icon */}
                <div className={`absolute inset-0 rounded-full bg-white opacity-0 animate-pulseLight
                                 ${isHovered ? 'opacity-20' : ''}`}
                     style={{ transition: 'opacity 0.3s ease-in-out' }}></div>

                {/* Ethereal background effect (moving gradients/blobs) */}
                <div className="absolute inset-0 animate-bgBlob opacity-30">
                    <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full bg-purple-200/80 blur-xl"></div>
                    <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-blue-200/80 blur-xl animation-delay-2000"></div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.8); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                @keyframes pulseLight {
                    0% { transform: scale(0.8); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 0.2; }
                    100% { transform: scale(0.8); opacity: 0; }
                }

                @keyframes bgBlob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(10%, 15%) scale(1.1); }
                    50% { transform: translate(-5%, -10%) scale(0.9); }
                    75% { transform: translate(12%, -8%) scale(1.05); }
                }

                @keyframes pressEffect {
                    0% { transform: scale(1); }
                    50% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }

                .animate-fadeInUp {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .animate-pulseLight {
                    animation: pulseLight 2s infinite ease-in-out;
                }
                .animate-bgBlob {
                    animation: bgBlob 10s infinite alternate ease-in-out;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animate-pressEffect {
                    animation: pressEffect 0.3s ease-out;
                }
            `}</style>
        </button>
    );
};

export default FloatingChatButton;
