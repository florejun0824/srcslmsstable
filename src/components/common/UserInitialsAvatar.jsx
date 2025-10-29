import React from 'react';

/**
 * Neumorphic avatar that shows photo or initials, with optional cosmetic borders.
 *
 * Props:
 * - user, firstName, lastName, id
 * - size: 'sm'|'md'|'lg'|'xl'|'full'
 * - className: additional tailwind classes for the main wrapper
 * - borderType: string identifier for the border (e..g, 'border_basic', 'border_animated')
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

// Maps borderType identifiers to Tailwind classes
export const getBorderClasses = (borderType) => { // <-- MODIFIED: Added export
    switch (borderType) {
        case 'border_basic':
            // Level 5: Gemini-style rotating gradient border.
            // Uses the "gradient padding" method.
            return 'bg-gradient-gemini animate-spin-fast';
        
        case 'border_animated':
            // NEW Level 10: "Breathing" Panning Gradient
            // A more sophisticated, slower pan and pulse.
            // Also uses the "gradient padding" method.
            return 'bg-gradient-advanced animate-gradient-pan animate-gentle-pulse';

        case 'border_advanced_animated':
            // This border uses the "ring" method.
            return 'ring-4 ring-offset-2 ring-offset-neumorphic-base border-t-transparent border-solid border-green-500 animate-spin-slow';

        case 'border_elite_animated':
             // This border uses the "ring" method.
            return 'ring-4 ring-transparent ring-offset-2 ring-offset-neumorphic-base bg-gradient-elite animate-gradient-glow';
        
        case 'border_legendary_animated':
            // This border uses the "ring" method.
            return 'ring-4 ring-transparent ring-offset-2 ring-offset-neumorphic-base bg-gradient-legendary animate-legendary-sparkle';
        
        default:
            return ''; // No border
    }
};

// Helper function to identify borders that use the padding method vs. the ring method
export const isGradientPaddingBorder = (borderType) => { // <-- MODIFIED: Added export
    return borderType === 'border_basic' || borderType === 'border_animated';
};


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

  // --- MODIFIED LOGIC ---
  // Determine border classes based on props and method
  const allClasses = effectsEnabled ? getBorderClasses(borderType) : '';
  const isGradientBorder = effectsEnabled && isGradientPaddingBorder(borderType);

  // Separate classes for the two rendering methods
  const gradientBorderClasses = isGradientBorder ? allClasses : '';
  const ringBorderClasses = !isGradientBorder ? allClasses : '';

  // Base wrapper class: Apply ring-based borders here, and conditional padding
  const wrapperBase = `relative rounded-full box-border flex items-center justify-center ${sizeClasses} ${className} ${isGradientBorder ? 'p-1' : ''} ${ringBorderClasses} bg-neumorphic-base shadow-neumorphic`;
  // --- END MODIFIED LOGIC ---

  // Photo case
  if (finalPhotoURL) {
    return (
      <div className={wrapperBase}>
        {/* Render inner div ONLY for gradient padding borders */}
        {isGradientBorder && (
             <div className={`absolute inset-0 rounded-full z-0 pointer-events-none ${gradientBorderClasses}`}></div>
        )}
        
        {/* Image needs relative and z-10 to sit above the border */}
        {/* We add a rounded-full here to clip the image *inside* the padding */}
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
    <div className={wrapperBase + ' cursor-pointer'}>
        {/* Render inner div ONLY for gradient padding borders */}
        {isGradientBorder && (
             <div className={`absolute inset-0 rounded-full z-0 pointer-events-none ${gradientBorderClasses}`}></div>
        )}

      {/* Gradient background - Needs relative, z-10, and rounded-full to clip inside padding */}
      <div className={`relative z-10 w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`} />
      
      {/* Initials text - Needs relative and z-20 to sit above gradient and border */}
      <span className="absolute inset-0 z-20 flex items-center justify-center font-semibold leading-none text-white select-none">
        {initials}
      </span>
    </div>
  );
};

export default UserInitialsAvatar;