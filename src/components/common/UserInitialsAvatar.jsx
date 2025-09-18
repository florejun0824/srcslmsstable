import React from 'react';

// ✅ REFINED: Softer, more modern gradient colors for a cleaner UI.
const gradientColors = [
    'from-blue-400 to-sky-500',
    'from-green-400 to-emerald-500',
    'from-purple-500 to-violet-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-red-500',
    'from-indigo-400 to-blue-500',
    'from-teal-400 to-cyan-500',
    'from-pink-500 to-rose-500',
];

// Function to get a consistent gradient based on a unique ID
const getUserGradient = (id) => {
    if (!id) return gradientColors[0]; // Default if no ID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradientColors.length;
    return gradientColors[index];
};

/**
 * Renders a user's avatar with a modern, iOS-inspired look.
 * Displays the user's profile picture or falls back to initials with a gradient.
 * * @param {object} props - The component props.
 * @param {object} [props.user] - A user object containing photoURL, firstName, lastName, and id.
 * @param {string} [props.firstName] - The user's first name (alternative to user object).
 * @param {string} [props.lastName] - The user's last name (alternative to user object).
 * @param {string} [props.id] - The user's ID, for consistent gradient (alternative to user object).
 * @param {string} [props.size='md'] - Preset size for the avatar: 'sm', 'md', 'lg', 'xl'.
 */
const UserInitialsAvatar = ({ user, firstName, lastName, id, size = 'md' }) => {
    
    // ✅ FIXED: Prioritize props correctly. Use direct props as a fallback to the user object.
    const finalFirstName = user?.firstName || firstName;
    const finalLastName = user?.lastName || lastName;
    const finalPhotoURL = user?.photoURL;
    const finalId = user?.id || id;

    // If a photoURL exists, render the image
    if (finalPhotoURL) {
        return (
            <img
                src={finalPhotoURL}
                alt={`${finalFirstName || ''} ${finalLastName || ''}`}
                className={`rounded-full object-cover bg-zinc-200`}
            />
        );
    }

    // Otherwise, generate initials and a gradient background
    const getInitials = (fName, lName) => {
        if (!fName && !lName) return '??';
        const firstInitial = fName ? fName[0] : '';
        const lastInitial = lName ? lName[0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };

    const initials = getInitials(finalFirstName, finalLastName);
    const gradient = getUserGradient(finalId);
    
    // ✅ IMPROVED: Use a size mapping for easier and more consistent styling.
    const sizeMap = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-20 w-20 text-2xl',
    };

    const sizeClasses = sizeMap[size] || sizeMap.md;

    return (
        <div
            className={`flex items-center justify-center rounded-full text-white font-semibold ${sizeClasses} bg-gradient-to-br ${gradient} ring-2 ring-white/50`}
        >
            {initials}
        </div>
    );
};

export default UserInitialsAvatar;