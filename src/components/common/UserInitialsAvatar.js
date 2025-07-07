import React from 'react';

// 1. Define a palette of gradients you like.
const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-400 to-blue-500',
    'from-pink-500 to-orange-500',
    'from-teal-400 to-yellow-200',
    'from-sky-400 to-cyan-300',
    'from-indigo-500 to-pink-500',
    'from-red-500 to-orange-400',
    'from-lime-400 to-emerald-500',
];

const UserInitialsAvatar = ({ firstName, lastName, size = 'md' }) => {
    const getInitials = (fName, lName) => `${fName ? fName.charAt(0).toUpperCase() : ''}${lName ? lName.charAt(0).toUpperCase() : ''}`;
    const initials = getInitials(firstName, lastName);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-lg',
        lg: 'w-12 h-12 text-xl',
        xl: 'w-24 h-24 text-4xl',
        full: 'w-full h-full text-5xl'
    };
    
    // 2. Create a deterministic index from the user's name.
    const nameString = (firstName || '') + (lastName || '');
    const charCodeSum = Array.from(nameString).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const gradientIndex = charCodeSum % gradients.length;
    const selectedGradient = gradients[gradientIndex];

    return (
        <div 
            className={`
                flex items-center justify-center rounded-full 
                font-bold text-white shadow-inner
                bg-gradient-to-br ${selectedGradient} 
                ${sizeClasses[size]} 
                flex-shrink-0
            `}
        >
            {initials}
        </div>
    );
};

export default UserInitialsAvatar;