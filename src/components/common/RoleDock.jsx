// src/components/RoleDock.js

import React from 'react';

/**
 * CONCEPT: An interactive "dock" for role selection in the "Helios UI".
 * It provides a spatial, tactile feedback mechanism where the selected
 * role appears to rise and glow.
 *
 * @param {object} props - The component props.
 * @param {string} props.role - The role identifier ('student' or 'teacher').
 * @param {string} props.title - The display title for the role.
 * @param {React.ElementType} props.Icon - The icon component.
 * @param {boolean} props.isSelected - True if this dock is currently selected.
 * @param {function} props.onSelect - Callback to handle selection.
 * @param {string} props.accentColor - The color theme for the dock.
 */
const RoleDock = ({ role, title, Icon, isSelected, onSelect, accentColor }) => {
    return (
        <button
            onClick={() => onSelect(role)}
            aria-pressed={isSelected}
            // CONCEPT: The container scales and gains a glow when selected, creating a 3D "pop" effect.
            // The unselected state is smaller and more subtle.
            className={`relative w-full h-24 flex flex-col items-center justify-center 
                        rounded-3xl cursor-pointer transition-all duration-500 ease-in-out
                        ${isSelected ? 'bg-white/80 scale-105 shadow-xl' : 'bg-white/50 scale-100 shadow-lg'}`}
        >
            {/* CONCEPT: The colored glow is an absolute positioned element that fades in when selected. */}
            <div className={`absolute -inset-4 rounded-full bg-${accentColor}-400 blur-2xl 
                             transition-opacity duration-500
                             ${isSelected ? 'opacity-40' : 'opacity-0'}`} 
            />
            
            <div className="relative z-10 flex flex-col items-center justify-center">
                <Icon 
                    className={`w-8 h-8 mb-1 transition-colors duration-300 
                               ${isSelected ? `text-${accentColor}-500` : 'text-gray-400'}`} 
                />
                <h3 
                    className={`font-semibold transition-colors duration-300
                               ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}
                >
                    {title}
                </h3>
            </div>
        </button>
    );
};

export default RoleDock;