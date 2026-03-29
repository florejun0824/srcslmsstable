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
  Rocket,
  Sun,
  Moon,
  Info // Added Info icon for the notice
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- THEME CONFIGURATION ---
const THEME_STYLES = {
  none: {
    label: 'Default',
    from: '#64748b', to: '#94a3b8', 
    bg: 'bg-slate-500',
    ring: 'ring-slate-500'
  },
  christmas: {
    label: 'Holiday',
    from: '#10b981', to: '#059669', 
    bg: 'bg-emerald-600',
    ring: 'ring-emerald-500'
  },
  valentines: {
    label: 'Love',
    from: '#ec4899', to: '#e11d48', 
    bg: 'bg-pink-500',
    ring: 'ring-pink-500'
  },
  graduation: {
    label: 'Grad',
    from: '#f59e0b', to: '#d97706', 
    bg: 'bg-amber-500',
    ring: 'ring-amber-500'
  },
  rainy: {
    label: 'Rainy',
    from: '#3b82f6', to: '#0ea5e9', 
    bg: 'bg-blue-500',
    ring: 'ring-blue-500'
  },
  cyberpunk: {
    label: 'Cyber',
    from: '#fbbf24', to: '#b45309', 
    bg: 'bg-amber-500',
    ring: 'ring-amber-500'
  },
  spring: {
    label: 'Spring',
    from: '#14b8a6', to: '#22c55e', 
    bg: 'bg-teal-500',
    ring: 'ring-teal-500'
  },
  space: {
    label: 'Cosmos',
    from: '#38bdf8', to: '#0284c7', 
    bg: 'bg-sky-500',
    ring: 'ring-sky-500'
  },
};

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
  const { activeOverlay, setActiveOverlay, setThemeMode, isDarkMode, toggleDarkMode } = useTheme();

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
      {/* Dark Mode Toggle (Always Enabled) */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleDarkMode();
        }}
        className={`
          w-full mb-3 flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300
          border overflow-hidden relative
          ${isDarkMode
            ? 'bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 text-white'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60 text-slate-800'
          }
        `}
      >
        <div className="flex items-center gap-3 relative z-10">
          <AnimatePresence mode="wait">
            {isDarkMode ? (
              <motion.div
                key="moon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon size={16} strokeWidth={2.5} className="text-indigo-300" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun size={16} strokeWidth={2.5} className="text-amber-500" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-xs font-bold tracking-wide">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
        {/* Toggle Pill */}
        <div className={`
          w-10 h-5 rounded-full relative transition-colors duration-300
          ${isDarkMode ? 'bg-indigo-500' : 'bg-amber-300'}
        `}>
          <motion.div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
            animate={{ left: isDarkMode ? '22px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </motion.button>

      {/* Temporary Notice */}
      <div className="mb-3 flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
        <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed font-medium text-indigo-700 dark:text-indigo-300">
          Theme features are currently disabled for bug fixing and will be back soon with fresh updates. Default theme and Light/Dark mode remain available.
        </p>
      </div>

      {/* 2-Column Grid of Pills */}
      <div className="grid grid-cols-2 gap-2">
        {overlayOptions.map((opt) => {
          const isDefault = opt.name === 'none';
          const isDisabled = !isDefault; // Disable all except the default theme
          const isActive = activeOverlay === opt.name;
          const style = THEME_STYLES[opt.name];
          const Icon = opt.icon;

          return (
            <motion.button
              key={opt.name}
              initial="idle"
              whileHover={isDisabled ? "idle" : "hover"}
              whileTap={isDisabled ? "idle" : "tap"}
              onClick={(e) => !isDisabled && handleThemeClick(e, opt.name)}
              disabled={isDisabled}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-all duration-300 border 
                ${isDisabled 
                  ? 'opacity-40 cursor-not-allowed grayscale-[30%]' 
                  : isActive
                    ? `border-transparent shadow-md shadow-${style.bg}/20`
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }
              `}
            >
              {/* Background Gradient (Only visible when active & not disabled) */}
              <AnimatePresence>
                {isActive && !isDisabled && (
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

              {/* Hover Glow Effect (Only visible when NOT active & not disabled) */}
              {!isActive && !isDisabled && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: style.from }}
                />
              )}

              {/* Icon Container */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  variants={iconVariants}
                  animate={isActive && !isDisabled ? opt.name : 'idle'}
                >
                  <Icon
                    size={16}
                    strokeWidth={2.5}
                    className={`transition-colors duration-300 ${isActive && !isDisabled ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}
                  />
                </motion.div>
              </div>

              {/* Label */}
              <span
                className={`
                  relative z-10 text-xs font-bold tracking-wide transition-colors duration-300
                  ${isActive && !isDisabled ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}
                `}
              >
                {style.label}
              </span>

              {/* Active Dot Indicator (Subtle) */}
              {isActive && !isDisabled && (
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