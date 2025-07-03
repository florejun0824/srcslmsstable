import React from 'react';

const UserInitialsAvatar = ({ firstName, lastName, size = 'md' }) => {
    const getInitials = (fName, lName) => `${fName ? fName.charAt(0).toUpperCase() : ''}${lName ? lName.charAt(0).toUpperCase() : ''}`;
    const initials = getInitials(firstName, lastName);
    const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-lg', lg: 'w-12 h-12 text-xl' };
    return <div className={`flex items-center justify-center rounded-full font-bold bg-blue-200 text-blue-800 ${sizeClasses[size]} flex-shrink-0`}>{initials}</div>;
};

export default UserInitialsAvatar;