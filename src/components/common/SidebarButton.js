import React from 'react';

const SidebarButton = ({ icon, text, onClick, isActive }) => {
    // Define styles for active and inactive states
    const baseClasses = "flex items-center w-full p-3 my-1 rounded-xl text-left transition-all duration-300 transform";
    const activeClasses = "bg-blue-500 font-semibold text-white shadow-lg -translate-x-1";
    const inactiveClasses = "text-slate-700 hover:bg-black/5 hover:translate-x-1";

    // Define background colors for icons
    const iconContainerClasses = `w-8 h-8 flex items-center justify-center rounded-lg mr-3 
        ${isActive ? 'bg-white/20' : 'bg-slate-200'}`;

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