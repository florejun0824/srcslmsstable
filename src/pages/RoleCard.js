// src/pages/RoleCard.js

import React from 'react';

/**
 * Renders a role selection card.
 * Displays an icon and a title, with interactive hover effects.
 *
 * @param {object} props - The component props.
 * @param {string} props.role - The role identifier (e.g., 'student', 'teacher').
 * @param {string} props.title - The title to display for the role.
 * @param {React.ElementType} props.Icon - The icon component to render (e.g., AcademicCapIcon, BriefcaseIcon).
 * @param {string} props.gradient - Tailwind CSS gradient classes for the background.
 * @param {string} props.textColor - Tailwind CSS class for the icon's color.
 * @param {function} props.onSelect - Callback function when the card is selected.
 */
const RoleCard = ({ role, title, Icon, gradient, textColor, onSelect }) => {
    return (
        <div
            className="group cursor-pointer flex flex-col items-center gap-4 transition-transform duration-300 hover:scale-105"
            onClick={() => onSelect(role)}
        >
            <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white group-hover:border-blue-300 transition-all duration-300 shadow-2xl flex items-center justify-center ${gradient}`}>
                {/* REVERTED: Using the Icon component directly with textColor */}
                {Icon && <Icon className={`w-2/3 h-2/3 transform group-hover:scale-110 transition-transform duration-300 ${textColor}`} />}
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 group-hover:text-black transition-colors duration-300">{title}</h2>
        </div>
    );
};

export default RoleCard;