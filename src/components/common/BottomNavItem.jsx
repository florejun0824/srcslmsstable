import React from 'react';

const BottomNavItem = ({ icon, text, onClick, isActive }) => (
    <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center p-2 rounded-lg w-1/4 transition-all duration-200 transform
            ${isActive ? 'bg-blue-500 text-white shadow-md -translate-y-1' : 'text-gray-600'}
        `}
    >
        {isActive ? React.cloneElement(icon, { className: 'text-white' }) : icon}
        <span className="text-xs mt-1 font-medium">{text}</span>
    </button>
);

export default BottomNavItem;