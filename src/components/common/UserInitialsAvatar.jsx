// src/common/UserInitialsAvatar.jsx
import React from 'react';

/**
 * Neumorphic avatar that shows photo or initials.
 * Ensures a true circular shape in all containers.
 *
 * Props:
 *  - user, firstName, lastName, id
 *  - size: 'sm'|'md'|'lg'|'xl'|'full'  (full => fills parent)
 *  - className: additional tailwind classes for wrapper
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

const UserInitialsAvatar = ({ user, firstName, lastName, id, size = 'md', className = '' }) => {
  const finalFirstName = user?.firstName || firstName || '';
  const finalLastName = user?.lastName || lastName || '';
  const finalPhotoURL = user?.photoURL || user?.photoUrl || user?.photo;
  const finalId = user?.id || id || '';

  // size mapping: note 'full' intentionally uses w-full h-full (fills parent)
  const sizeMap = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
    full: 'w-full h-full text-base',
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

  // Shared wrapper: aspect-square + rounded-full ensures perfect circle
  // box-border ensures padding (if any) doesn't break layout, but we recommend not adding padding to the wrapper
  const wrapperBase = `relative rounded-full overflow-hidden box-border flex items-center justify-center ${sizeClasses} ${className}`;

  // Photo case (image is block to avoid inline whitespace issues)
  if (finalPhotoURL) {
    return (
      <div className={wrapperBase + ' bg-neumorphic-base shadow-neumorphic'}>
        <img
          src={finalPhotoURL}
          alt={`${finalFirstName} ${finalLastName}`.trim()}
          className="w-full h-full object-cover rounded-full block"
          style={{ display: 'block' }}
        />
      </div>
    );
  }

  // Initials case: gradient background (absolute), initials on top (z-10)
  return (
    <div className={wrapperBase + ' bg-neumorphic-base shadow-neumorphic cursor-pointer'}>
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient}`} />
      <span className="relative z-10 font-semibold leading-none text-white select-none">
        {initials}
      </span>
    </div>
  );
};

export default UserInitialsAvatar;
