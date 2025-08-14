import React from 'react';

// Define a set of appealing gradient colors for profile pictures
const gradientColors = [
    'from-blue-400 to-indigo-500',
    'from-green-400 to-teal-500',
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-rose-500',
    'from-indigo-400 to-purple-500',
    'from-teal-400 to-cyan-500',
    'from-pink-400 to-red-500',
];

// Function to get a consistent gradient based on user ID
const getUserGradient = (userId) => {
    if (!userId) return gradientColors[0]; // Default if no userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradientColors.length;
    return gradientColors[index];
};

/**
 * Renders a user's avatar.
 * Displays the user's profile picture if available (user.photoURL).
 * Falls back to a gradient background with the user's initials.
 * @param {object} props - The component props.
 * @param {object} props.user - The user object, containing photoURL, firstName, lastName, and id.
 * @param {string} [props.size='h-10 w-10'] - The Tailwind CSS size classes for the avatar. Can be 'full'.
 */
const UserInitialsAvatar = ({ user, size = 'h-10 w-10' }) => {
    // If a photoURL exists, use it
    if (user?.photoURL) {
        return (
            <img
                src={user.photoURL}
                alt={`${user.firstName || ''} ${user.lastName || ''}`}
                className={`rounded-full object-cover ${size === 'full' ? 'w-full h-full' : size}`}
            />
        );
    }

    // Otherwise, generate initials and a gradient background
    const getInitials = (firstName, lastName) => {
        if (!firstName && !lastName) return '??';
        const firstInitial = firstName ? firstName[0] : '';
        const lastInitial = lastName ? lastName[0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };

    const initials = getInitials(user?.firstName, user?.lastName);
    const gradient = getUserGradient(user?.id);
    
    // Handle the 'full' size case for text size as well
    const sizeClasses = size === 'full' ? 'w-full h-full text-6xl' : size;

    return (
        <div
            className={`flex items-center justify-center rounded-full text-white font-bold ${sizeClasses} bg-gradient-to-br ${gradient}`}
        >
            {initials}
        </div>
    );
};

export default UserInitialsAvatar;