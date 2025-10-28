import React from 'react';

/**
 * Neumorphic avatar that shows photo or initials, with optional cosmetic borders.
 *
 * Props:
 * - user, firstName, lastName, id
 * - size: 'sm'|'md'|'lg'|'xl'|'full'
 * - className: additional tailwind classes for the main wrapper
 * - borderType: string identifier for the border (e.g., 'border_basic', 'border_animated')
 * - effectsEnabled: boolean, controls if cosmetic effects like borders are shown
 */
const gradientColors = [
  'from-blue-400 to-sky-500',
  'from-green-400 to-emerald-500',
  'from-purple-500 to-violet-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-indigo-400 to-blue-500',
  'from-teal-400 to-cyan-500',
  'from-pink-500 to-rose-500',
];

const getUserGradient = (id) => {
  if (!id) return gradientColors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradientColors.length;
  return gradientColors[index];
};

// --- ADDED: Border Class Logic ---
// Maps borderType identifiers to Tailwind classes
const getBorderClasses = (borderType) => {
    switch (borderType) {
        case 'border_basic':
            // Simple static border (adjust color/width as needed)
            return 'ring-4 ring-blue-500 ring-offset-2 ring-offset-neumorphic-base'; // Example: Blue ring
        case 'border_animated':
            // Simple animation (e.g., pulse)
            return 'ring-4 ring-purple-500 ring-offset-2 ring-offset-neumorphic-base animate-pulse'; // Example: Pulsing purple ring
        case 'border_advanced_animated':
            // More complex animation (e.g., custom spin - requires defining 'animate-spin-slow' in CSS)
            return 'ring-4 ring-offset-2 ring-offset-neumorphic-base border-t-transparent border-solid border-green-500 animate-spin-slow'; // Example: Spinning green segment
        case 'border_elite_animated':
             // Example using gradient and maybe a custom animation
             // Requires defining 'animate-gradient-glow' and 'bg-gradient-elite' in CSS
            return 'ring-4 ring-transparent ring-offset-2 ring-offset-neumorphic-base bg-gradient-elite animate-gradient-glow';
        case 'border_legendary_animated':
            // Example using multiple effects (requires custom CSS/animation)
            // Requires defining 'animate-legendary-sparkle' and 'bg-gradient-legendary' in CSS
            return 'ring-4 ring-transparent ring-offset-2 ring-offset-neumorphic-base bg-gradient-legendary animate-legendary-sparkle';
        default:
            return ''; // No border
    }
};
// --- END ADDED ---

const UserInitialsAvatar = ({
    user,
    firstName,
    lastName,
    id,
    size = 'md',
    className = '',
    borderType = 'none', // Default to no border
    effectsEnabled = true // Default to enabled
}) => {
  const finalFirstName = user?.firstName || firstName || '';
  const finalLastName = user?.lastName || lastName || '';
  const finalPhotoURL = user?.photoURL || user?.photoUrl || user?.photo;
  const finalId = user?.id || id || '';

  // size mapping
  const sizeMap = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
    full: 'w-full h-full text-base', // Use for responsive sizing if needed
  };
  const sizeClasses = sizeMap[size] || sizeMap.md;

  // initials
  const getInitials = (f, l) => {
    if (!f && !l) return '??';
    const fi = f ? f.trim()[0] : '';
    const li = l ? l.trim()[0] : '';
    return `${fi}${li}`.toUpperCase();
  };
  const initials = getInitials(finalFirstName, finalLastName);
  const gradient = getUserGradient(finalId);

  // Determine border classes based on props
  const borderClasses = effectsEnabled ? getBorderClasses(borderType) : '';

  // --- MODIFIED: Base wrapper class ---
  // Added position: relative to contain the absolute border
  const wrapperBase = `relative rounded-full overflow-hidden box-border flex items-center justify-center ${sizeClasses} ${className}`;
  // --- END MODIFIED ---

  // Photo case
  if (finalPhotoURL) {
    return (
      <div className={wrapperBase + ' bg-neumorphic-base shadow-neumorphic'}>
        {/* --- ADDED: Border Element --- */}
        {borderClasses && (
             <div className={`absolute inset-0 rounded-full z-0 pointer-events-none ${borderClasses}`}></div>
        )}
        {/* --- END ADDED --- */}
        {/* Image needs relative and z-10 to sit above the border */}
        <img
          src={finalPhotoURL}
          alt={`${finalFirstName} ${finalLastName}`.trim()}
          className="relative z-10 w-full h-full object-cover rounded-full block"
          style={{ display: 'block' }} // Ensure no extra space below image
        />
      </div>
    );
  }

  // Initials case
  return (
    <div className={wrapperBase + ' bg-neumorphic-base shadow-neumorphic cursor-pointer'}>
        {/* --- ADDED: Border Element --- */}
        {borderClasses && (
             <div className={`absolute inset-0 rounded-full z-0 pointer-events-none ${borderClasses}`}></div>
        )}
        {/* --- END ADDED --- */}

      {/* Gradient background - Needs relative and z-10 */}
      <div className={`relative z-10 w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`} />
      {/* Initials text - Needs relative and z-20 to sit above gradient and border */}
      <span className="absolute inset-0 z-20 flex items-center justify-center font-semibold leading-none text-white select-none">
        {initials}
      </span>
    </div>
  );
};

export default UserInitialsAvatar;