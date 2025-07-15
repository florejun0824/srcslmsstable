import React from 'react';

const SidebarButton = ({ icon, text, onClick, isActive }) => {
    // Define styles for active and inactive states with glassmorphism in mind
    const baseClasses = "flex items-center w-full p-3 my-1 rounded-xl text-left transition-all duration-300 transform";
    
    // Updated active state: using primary color, subtle background, and scale effect
    // The background is still translucent to show the blurred sidebar behind it.
    const activeClasses = "bg-primary-600/20 text-primary-800 font-semibold shadow-md translate-x-1 scale-[1.02] border border-primary-300"; 
    
    // Updated inactive state: lighter text, with a very subtle translucent background even when not hovered,
    // and a more pronounced glassmorphism hover effect.
    const inactiveClasses = "text-gray-700 bg-white/10 hover:bg-white/30 hover:shadow-sm hover:translate-x-1 border border-transparent hover:border-white/20";

    // Icon container: vibrant for active, subtle for inactive
    const iconContainerClasses = `w-8 h-8 flex items-center justify-center rounded-lg mr-3 
        ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-200/50 text-gray-600 border border-gray-300/50'}`; // Icon background also translucent

    return (
        <button 
            onClick={onClick} 
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            <span className={iconContainerClasses}>
                {icon}
            </span>
            <span className="text-sm font-medium">{text}</span>
        </button>
    );
};

export default SidebarButton;