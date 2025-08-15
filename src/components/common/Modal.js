import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md', roundedClass = 'rounded-lg', containerClassName = '' }) => {
    if (!isOpen) return null;
    
    // Added '7xl' and 'screen' for more flexible sizing options.
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        'screen': 'max-w-screen-2xl'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4">
            <div className={`bg-white ${roundedClass} shadow-xl w-full ${sizeClasses[size]} flex flex-col ${containerClassName}`}>
                <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl p-1">&times;</button>
                </div>
                {/* Removed padding, added flex-grow and overflow-hidden to allow child to control scrolling */}
                <div className="overflow-hidden flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;