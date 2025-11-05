// src/config/gameConfig.js
import { arrayUnion } from 'firebase/firestore';
// --- ADDED: Import the icons needed for the Rewards Page ---
import {
    PaintBrushIcon,
    PhotoIcon,
    UserCircleIcon,
    AcademicCapIcon
} from '@heroicons/react/24/solid';

// --- XP Constants ---
export const XP_FOR_LESSON = 400; // Doubled from 100
export const XP_PER_QUIZ_QUESTION = 50;

// --- REWARDS CONFIG (The Single Source of Truth - NOW WITH ALL DATA) ---
export const REWARDS_CONFIG = {
    // Borders
    'border_basic': { 
        level: 5, 
        type: 'border', 
        name: 'Basic Border', 
        icon: PaintBrushIcon, 
        description: 'A simple, clean border.' 
    },
    'border_animated': { 
        level: 10, 
        type: 'border', 
        name: 'Animated Border', 
        icon: PaintBrushIcon, 
        description: 'A subtly pulsing border.' 
    },
    'border_advanced_animated': { 
        level: 30, 
        type: 'border', 
        name: 'Advanced Animated Border', 
        icon: PaintBrushIcon, 
        description: 'A spinning, eye-catching border.' 
    },
    'border_elite_animated': { 
        level: 50, 
        type: 'border', 
        name: 'Elite Animated Border', 
        icon: PaintBrushIcon, 
        description: 'A highly stylized border.' 
    },
    'border_legendary_animated': { 
        level: 80, 
        type: 'border', 
        name: 'Legendary Animated Border', 
        icon: PaintBrushIcon, 
        description: 'A border with striking visual effects.' 
    },
    // Backgrounds
    'bg_pattern_1': { 
        level: 20, 
        type: 'background', 
        name: 'Subtle Pattern Background', 
        icon: PhotoIcon, 
        description: 'A gentle pattern for your profile.' 
    },
    'bg_pattern_2': { 
        level: 40, 
        type: 'background', 
        name: 'Intricate Pattern Background', 
        icon: PhotoIcon, 
        description: 'A more detailed background design.' 
    },
    'bg_pattern_elite': { 
        level: 60, 
        type: 'background', 
        name: 'Elite Background', 
        icon: PhotoIcon, 
        description: 'A premium background theme.' 
    },
    'bg_pattern_legendary': { 
        level: 90, 
        type: 'background', 
        name: 'Legendary Background', 
        icon: PhotoIcon, 
        description: 'A top-tier background.' 
    },
    // Features
    'canSetBio': { 
        level: 15, 
        type: 'feature', 
        name: 'Custom Bio', 
        icon: UserCircleIcon, 
        description: 'Unlock the ability to set a custom bio.' 
    },
    // Titles
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
    // Badges (from leveling)
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