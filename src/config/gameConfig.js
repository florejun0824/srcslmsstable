// src/config/gameConfig.js
import { arrayUnion } from 'firebase/firestore';
import {
    UserCircleIcon,
    PhotoIcon,
    PencilSquareIcon,
    PlusCircleIcon,
    ChatBubbleLeftRightIcon,
    LockClosedIcon,
    UsersIcon,
    CameraIcon,
    AcademicCapIcon
} from '@heroicons/react/24/solid';

// --- XP Constants ---
export const XP_FOR_LESSON = 100; // <-- 1. HERE IS THE FIX
export const XP_PER_QUIZ_QUESTION = 50;

// --- REWARDS CONFIG (The Single Source of Truth - NOW WITH ALL DATA) ---
export const REWARDS_CONFIG = {
    // --- NEW: Feature Unlocks ---
    'feat_profile_picture': {
        level: 5,
        type: 'feature',
        name: 'Profile Picture Upload',
        icon: UserCircleIcon,
        description: 'Unlock the ability to upload a custom profile picture.'
    },
    'feat_cover_photo': {
        level: 10,
        type: 'feature',
        name: 'Cover Photo Upload',
        icon: PhotoIcon,
        description: 'Unlock the ability to upload a profile cover photo.'
    },
    'canSetBio': { 
        level: 15, 
        type: 'feature', 
        name: 'Custom Bio', 
        icon: PencilSquareIcon,
        description: 'Unlock the ability to set a custom bio.' 
    },
    'feat_update_info': {
        level: 20,
        type: 'feature',
        name: 'Update "About" Info',
        icon: PencilSquareIcon,
        description: 'Unlock fields to add work, education, and location.'
    },
    'feat_create_post': {
        level: 30,
        type: 'feature',
        name: 'Create Posts',
        icon: PlusCircleIcon,
        description: 'Unlock the ability to create posts.'
    },
    'feat_reactions': {
        level: 40,
        type: 'feature',
        name: 'Reactions & Comments',
        icon: ChatBubbleLeftRightIcon,
        description: 'Unlock the ability to react and comment.'
    },
    'feat_profile_privacy': {
        level: 50,
        type: 'feature',
        name: 'Profile Privacy',
        icon: LockClosedIcon,
        description: 'Unlock profile privacy settings (Coming Soon).'
    },
    'feat_visit_profiles': {
        level: 60,
        type: 'feature',
        name: 'Visit Profiles',
        icon: UsersIcon,
        description: 'Unlock the ability to visit other student profiles (Coming Soon).'
    },
    'feat_photo_1': {
        level: 65,
        type: 'feature',
        name: 'Featured Photo (1)',
        icon: CameraIcon,
        description: 'Unlock your first featured photo slot (Coming Soon).'
    },
    'feat_photo_2': {
        level: 70,
        type: 'feature',
        name: 'Featured Photo (2)',
        icon: CameraIcon,
        description: 'Unlock a second featured photo slot (Coming Soon).'
    },
    'feat_photo_3': {
        level: 80,
        type: 'feature',
        name: 'Featured Photo (3)',
        icon: CameraIcon,
        description: 'Unlock a third featured photo slot (Coming Soon).'
    },

    // --- RETAINED: Titles ---
    'title_adept': { 
        level: 35, 
        type: 'title', 
        name: 'Title: Adept', 
        icon: AcademicCapIcon, 
        description: 'Display the "Adept" title.' 
    },
    'title_guru': { 
        level: 70, 
        type: 'title', 
        name: 'Title: Guru', 
        icon: AcademicCapIcon, 
        description: 'Display the "Guru" title.' 
    },
    'title_legend': { 
        level: 100, 
        type: 'title', 
        name: 'Title: Legend', 
        icon: AcademicCapIcon, 
        description: 'Display the ultimate "Legend" title.' 
    },

    // --- RETAINED: Badges (from leveling) ---
    'badge_scholar': { 
        level: 25, 
        type: 'badge', 
        name: 'Scholar Badge', 
        icon: AcademicCapIcon, 
        description: 'Awarded for reaching Level 25.' 
    },
    'badge_master': { 
        level: 45, 
        type: 'badge', 
        name: 'Master Badge', 
        icon: AcademicCapIcon, 
        description: 'Awarded for reaching Level 45.' 
    },
    'badge_legend': { 
        level: 100, 
        type: 'badge', 
        name: 'Legend Badge', 
        icon: AcademicCapIcon, 
        description: 'Awarded for reaching Level 100.' 
    },
};

/**
 * Calculates a user's level based on their total XP.
 * @param {number} xp - The user's total XP.
 * @returns {number} The user's calculated level.
 */
export const calculateLevelFromXp = (xp = 0) => {
  if (xp <= 0) return 1;
  // Solves for 'n' (level) in: XP = (n * (n+1) / 2) * 500
  const level = Math.floor((Math.sqrt(1 + (8 * xp) / 500) - 1) / 2) + 1;
  return Math.max(1, level);
};