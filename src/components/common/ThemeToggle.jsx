// src/components/common/ThemeToggle.jsx
import React from 'react';
import { 
  Snowflake, 
  Heart, 
  GraduationCap, 
  Ban,
  CloudRain,
  Zap,
  Flower2,
  Rocket
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- THEME CONFIGURATION ---
// Refined gradients for a sleeker "Glass Pill" look
const THEME_STYLES = {
  none: { 
    label: 'Default',
    from: '#64748b', to: '#94a3b8', // Slate
    bg: 'bg-slate-500',
    ring: 'ring-slate-500'
  },
  christmas: { 
    label: 'Holiday',
    from: '#10b981', to: '#059669', // Emerald
    bg: 'bg-emerald-600',
    ring: 'ring-emerald-500'
  },
  valentines: { 
    label: 'Love',
    from: '#ec4899', to: '#e11d48', // Pink/Rose
    bg: 'bg-pink-500',
    ring: 'ring-pink-500'
  },
  graduation: { 
    label: 'Grad',
    from: '#f59e0b', to: '#d97706', // Amber
    bg: 'bg-amber-500',
    ring: 'ring-amber-500'
  },
  rainy: { 
    label: 'Rainy',
    from: '#3b82f6', to: '#0ea5e9', // Blue/Cyan
    bg: 'bg-blue-500',
    ring: 'ring-blue-500'
  },
  cyberpunk: { 
    label: 'Cyber',
    from: '#d946ef', to: '#8b5cf6', // Fuchsia/Violet
    bg: 'bg-fuchsia-500',
    ring: 'ring-fuchsia-500'
  },
  spring: { 
    label: 'Spring',
    from: '#14b8a6', to: '#22c55e', // Teal/Green
    bg: 'bg-teal-500',
    ring: 'ring-teal-500'
  },
  space: { 
    label: 'Cosmos',
    from: '#6366f1', to: '#7c3aed', // Indigo/Violet
    bg: 'bg-indigo-500',
    ring: 'ring-indigo-500'
  },
};

// Subtle icon animations retained but smoothed out
const iconVariants = {
  idle: { rotate: 0, scale: 1, y: 0 },
  hover: { scale: 1.1, rotate: 5 },
  tap: { scale: 0.9 },
  christmas: { rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } },
  valentines: { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.2 } },
  graduation: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 1.5 } },
  rainy: { y: [0, 2, 0], transition: { repeat: Infinity, duration: 1.5 } },
  cyberpunk: { filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"], transition: { duration: 1, repeat: Infinity } },
  spring: { rotate: 360, transition: { duration: 4, ease: "linear", repeat: Infinity } },
  space: { rotate: [0, 5, -5, 0], y: [0, -2, 0], transition: { duration: 3, repeat: Infinity } },
  none: { scale: 1 }
};

const ThemeToggle = ({ onRequestThemeChange }) => {
  const { activeOverlay, setActiveOverlay, setThemeMode } = useTheme();

  const overlayOptions = [
    { name: 'none', icon: Ban },
    { name: 'christmas', icon: Snowflake },
    { name: 'valentines', icon: Heart },
    { name: 'graduation', icon: GraduationCap },
    { name: 'rainy', icon: CloudRain },
    { name: 'cyberpunk', icon: Zap },
    { name: 'spring', icon: Flower2 },
    { name: 'space', icon: Rocket },
  ];

  const handleThemeClick = (e, themeName) => {
    e.preventDefault();
    e.stopPropagation();

    if (themeName === 'none') {
        setActiveOverlay('none');
        setThemeMode('lite'); 
    } else {
        if (onRequestThemeChange) {
            onRequestThemeChange(themeName);
        }
    }
  };

  return (
    <div className="w-full px-1 pb-1">
      {/* 2-Column Grid of Pills */}
      <div className="grid grid-cols-2 gap-2">
        {overlayOptions.map((opt) => {
          const isActive = activeOverlay === opt.name;
          const style = THEME_STYLES[opt.name];
          const Icon = opt.icon;
          
          return (
            <motion.button
              key={opt.name}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={(e) => handleThemeClick(e, opt.name)}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-all duration-300
                border 
                ${isActive 
                  ? `border-transparent shadow-md shadow-${style.bg}/20` 
                  : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }
              `}
            >
              {/* Background Gradient (Only visible when active) */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-r"
                    style={{ 
                        backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})` 
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Hover Glow Effect (Only visible when NOT active) */}
              {!isActive && (
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: style.from }}
                />
              )}

              {/* Icon Container */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  variants={iconVariants}
                  animate={isActive ? opt.name : (opt.name === 'space' || opt.name === 'spring' ? 'idle' : 'idle')} 
                  // Note: Constant animation on idle can be distracting, so mostly limited to active
                >
                    <Icon 
                        size={16} 
                        strokeWidth={2.5}
                        className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}
                    />
                </motion.div>
              </div>

              {/* Label */}
              <span 
                className={`
                  relative z-10 text-xs font-bold tracking-wide transition-colors duration-300
                  ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}
                `}
              >
                {style.label}
              </span>
              
              {/* Active Dot Indicator (Subtle) */}
              {isActive && (
                 <motion.div
                    layoutId="activeThemeDot"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-sm z-10"
                 />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeToggle;