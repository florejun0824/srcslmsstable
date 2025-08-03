import React from 'react';

// 1. Define a vibrant and harmonious palette of gradients.
const gradients = [
    'from-blue-600 to-purple-700',      // Deep Blue to Violet
    'from-green-500 to-teal-600',       // Emerald to Teal
    'from-pink-600 to-rose-700',        // Vibrant Pink to Rose
    'from-orange-500 to-yellow-600',    // Warm Orange to Golden Yellow
    'from-red-600 to-purple-600',       // Bold Red to Royal Purple
    'from-cyan-500 to-blue-600',        // Bright Cyan to Strong Blue
    'from-emerald-500 to-lime-600',     // Lush Emerald to Zesty Lime
    'from-fuchsia-600 to-pink-500',     // Deep Fuchsia to Soft Pink
    'from-indigo-600 to-blue-700',      // Rich Indigo to Dark Blue
];

// 2. Define size classes for consistent sizing.
const sizeClasses = {
    sm: 'w-8 h-8 text-xs',      // Small (e.g., for lists, comments)
    md: 'w-10 h-10 text-base',  // Medium (default, common use)
    lg: 'w-12 h-12 text-lg',    // Large (e.g., headers, profile cards)
    xl: 'w-16 h-16 text-2xl',   // Extra Large (e.g., hero sections)
    '2xl': 'w-24 h-24 text-4xl', // Very Large (e.g., dedicated profile page)
};

const UserInitialsAvatar = ({ user, size = 'md', className = '' }) => {
    // Ensure user object exists and has displayName or email
    // Now 'sizeClasses' is defined before this block.
    if (!user || (!user.displayName && !user.email)) {
        return (
            <div className={`relative flex items-center justify-center font-semibold rounded-full bg-gray-300 text-gray-600 overflow-hidden ${sizeClasses[size] || sizeClasses['md']} ${className}`}>
                <span className="opacity-70">?</span>
            </div>
        );
    }

    const getInitials = (name) => {
        if (!name) return '';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return `${parts[0].charAt(0).toUpperCase()}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
    };

    const nameToUse = user.displayName || user.email;
    const initials = getInitials(nameToUse);

    // Create a deterministic index from the user's name (more robust).
    const nameHash = nameToUse.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradientIndex = nameHash % gradients.length;
    const selectedGradient = gradients[gradientIndex];

    const currentSizeClass = sizeClasses[size] || sizeClasses['md'];

    return (
        <div
            className={`relative flex items-center justify-center font-semibold rounded-full
                        bg-gradient-to-br ${selectedGradient} text-white
                        shadow-md transition-all duration-300 transform
                        hover:scale-105 hover:shadow-lg
                        border border-white/20 overflow-hidden
                        ${currentSizeClass} ${className}`}
        >
            {initials}
            {/* Optional: Add a subtle overlay for depth */}
            <div className="absolute inset-0 rounded-full bg-black opacity-10"></div>
        </div>
    );
};

export default UserInitialsAvatar;