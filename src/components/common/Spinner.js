import React from 'react';

/**
 * A colorful pinwheel spinner component.
 * This spinner is self-contained and can be placed anywhere in your application.
 * The parent component is responsible for positioning and layout.
 */
const Spinner = () => (
    <div className="flex justify-center items-center p-4">
        <div
            className="w-16 h-16 animate-spin rounded-full"
            style={{
                // Creates a cone-shaped gradient with sharp color stops for the pinwheel effect.
                background: 'conic-gradient(from 90deg at 50% 50%, #3b82f6 0%, #10b981 25%, #f59e0b 50%, #ef4444 75%, #a78bfa 100%)',
                
                // Uses a mask to cut out the center, turning the circle into a ring.
                // The 'calc' function creates a border thickness of 10px.
                mask: 'radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0)',
                WebkitMask: 'radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0)',
            }}
        />
    </div>
);

export default Spinner;
