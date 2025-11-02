// src/components/RoleDock.js
import React from 'react';

/**
 * Neumorphic RoleDock Component
 * - Soft 3D role selector with glowing gradient feedback.
 * - Selected role "pops" with bright gradient and raised depth.
 * - Hovering roles show faint gradient shimmer for interactivity.
 * - Fully dark mode compatible.
 */
const RoleDock = ({ role, title, Icon, isSelected, onSelect, accentColor }) => {
  // Define gradient mappings for accents
  const gradientMap = {
    blue: 'from-blue-400 via-indigo-500 to-purple-500 dark:from-blue-500 dark:via-indigo-600 dark:to-purple-600',
    teal: 'from-teal-400 via-emerald-500 to-cyan-500 dark:from-teal-500 dark:via-emerald-600 dark:to-cyan-600',
    purple: 'from-purple-400 via-pink-500 to-fuchsia-500 dark:from-purple-500 dark:via-pink-600 dark:to-fuchsia-600',
  };

  const glowGradient = gradientMap[accentColor] || gradientMap.blue;

  return (
    <button
      onClick={() => onSelect(role)}
      aria-pressed={isSelected}
      className={`
        relative w-full h-24 flex flex-col items-center justify-center
        rounded-2xl cursor-pointer transition-all duration-500 ease-in-out
        ${isSelected 
          ? 'shadow-neumorphic-strong dark:shadow-neumorphic-strong-dark scale-105' 
          : 'shadow-neumorphic dark:shadow-neumorphic-dark scale-100'}
        bg-gray-100 dark:bg-neumorphic-base-dark overflow-hidden group
      `}
    >
      {/* Gradient Glow Layer (visible when selected or hovered) */}
      <div
        className={`
          absolute -inset-2 rounded-2xl blur-3xl transition-all duration-500 opacity-0
          ${isSelected ? `opacity-100 bg-gradient-to-r ${glowGradient}` : 'group-hover:opacity-50 bg-gradient-to-r ' + glowGradient}
        `}
      />

      {/* Inner Content */}
      <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-500">
        {Icon && (
          <Icon
            className={`
              w-8 h-8 mb-2 transition-colors duration-300
              ${isSelected
                ? `text-${accentColor}-500 dark:text-${accentColor}-400`
                : 'text-gray-400 dark:text-slate-500 group-hover:text-slate-300 dark:group-hover:text-slate-200'}
            `}
          />
        )}
        <h3
          className={`
            font-semibold transition-colors duration-300
            ${isSelected
              ? 'text-gray-800 dark:text-slate-100'
              : 'text-gray-500 dark:text-slate-400 group-hover:text-slate-300 dark:group-hover:text-slate-200'}
          `}
        >
          {title}
        </h3>
      </div>
    </button>
  );
};

export default RoleDock;
