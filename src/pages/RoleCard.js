// src/pages/RoleCard.js

import React from 'react';

const RoleCard = ({ role, title, imgSrc, onSelect }) => {
    return (
        <div
            className="group cursor-pointer flex flex-col items-center gap-4 transition-transform duration-300 hover:scale-105"
            onClick={() => onSelect(role)}
        >
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white group-hover:border-blue-300 transition-all duration-300 shadow-2xl">
                <img
                    className="w-full h-full object-cover"
                    src={imgSrc}
                    alt={`${title} character`}
                    loading="lazy" // Lazy loading attribute
                />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 group-hover:text-black transition-colors duration-300">{title}</h2>
        </div>
    );
};

export default RoleCard;