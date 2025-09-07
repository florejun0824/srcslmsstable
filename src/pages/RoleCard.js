// src/pages/RoleCard.js

import React from 'react';

/**
 * Renders a segment for a macOS-inspired segmented control.
 * Used for role selection (Student/Teacher).
 *
 * @param {object} props - The component props.
 * @param {string} props.role - The role identifier.
 * @param {string} props.title - The title to display.
 * @param {React.ElementType} props.Icon - The icon component.
 * @param {boolean} props.isSelected - Whether this card is the currently selected role.
 * @param {function} props.onSelect - Callback function when the card is selected.
 */
const RoleCard = ({ role, title, Icon, isSelected, onSelect }) => {
    // NEW: The component is now a button within a segmented control.
    // The visual style changes significantly based on the `isSelected` prop.
    // Selected state has a solid white background and shadow, giving it a raised, active look.
    // Unselected state is flat and semi-transparent.
    const baseClasses = "w-full flex items-center justify-center gap-2 p-2.5 rounded-md cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400";
    
    const selectedClasses = "bg-white shadow-sm text-gray-800";
    const unselectedClasses = "bg-transparent text-gray-600 hover:bg-white/50";

    return (
        <button
            type="button" // Important for forms
            className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
            onClick={() => onSelect(role)}
            aria-pressed={isSelected}
        >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="text-sm font-semibold">{title}</span>
        </button>
    );
};

export default RoleCard;