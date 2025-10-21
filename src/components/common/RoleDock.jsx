// src/components/RoleDock.js

import React from 'react';

/**
 * Neumorphic RoleDock Component
 * - Provides tactile, soft 3D feedback for role selection.
 * - Selected role "pops" with stronger shadows + subtle accent glow.
 */
const RoleDock = ({ role, title, Icon, isSelected, onSelect, accentColor }) => {
  return (
    <button
      onClick={() => onSelect(role)}
      aria-pressed={isSelected}
      className={`
        relative w-full h-24 flex flex-col items-center justify-center
        rounded-2xl cursor-pointer transition-all duration-500 ease-in-out
        ${isSelected ? 'shadow-neumorphic-strong scale-105' : 'shadow-neumorphic scale-100'}
        bg-gray-100
      `}
    >
      {/* Accent Glow */}
      <div
        className={`
          absolute -inset-2 rounded-2xl blur-2xl transition-opacity duration-500
          ${isSelected ? `bg-${accentColor}-400/40 opacity-100` : 'opacity-0'}
        `}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {Icon && (
          <Icon
            className={`
              w-8 h-8 mb-2 transition-colors duration-300
              ${isSelected ? `text-${accentColor}-500` : 'text-gray-400'}
            `}
          />
        )}
        <h3
          className={`
            font-semibold transition-colors duration-300
            ${isSelected ? 'text-gray-800' : 'text-gray-500'}
          `}
        >
          {title}
        </h3>
      </div>
    </button>
  );
};

export default RoleDock;
