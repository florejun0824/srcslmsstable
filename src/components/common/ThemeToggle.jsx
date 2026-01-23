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
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

// --- THEME CONFIGURATION ---
// Define specific gradients and icon styles for each theme
const THEME_ASSETS = {
  none: {
    gradient: 'from-slate-400 to-slate-600',
    iconColor: 'text-slate-100',
    shadow: 'shadow-slate-500/20'
  },
  christmas: {
    gradient: 'from-emerald-500 to-green-600',
    iconColor: 'text-red-50',
    shadow: 'shadow-emerald-500/30'
  },
  valentines: {
    gradient: 'from-pink-500 to-rose-600',
    iconColor: 'text-pink-50',
    shadow: 'shadow-pink-500/30'
  },
  graduation: {
    gradient: 'from-yellow-500 to-amber-600',
    iconColor: 'text-amber-50',
    shadow: 'shadow-amber-500/30'
  },
  rainy: {
    gradient: 'from-blue-500 to-cyan-600',
    iconColor: 'text-blue-50',
    shadow: 'shadow-blue-500/30'
  },
  cyberpunk: {
    gradient: 'from-fuchsia-500 to-purple-600',
    iconColor: 'text-fuchsia-50',
    shadow: 'shadow-fuchsia-500/30'
  },
  spring: {
    gradient: 'from-teal-400 to-emerald-500',
    iconColor: 'text-teal-50',
    shadow: 'shadow-teal-500/30'
  },
  space: {
    gradient: 'from-indigo-500 to-violet-600',
    iconColor: 'text-indigo-50',
    shadow: 'shadow-indigo-500/30'
  },
};

// --- ANIMATION VARIANTS (Hover Only) ---
const containerVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

const iconVariants = {
  idle: { rotate: 0, scale: 1, y: 0 },
  // Specific Animations trigger on Hover
  christmas: { rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } },
  valentines: { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 0.8 } },
  graduation: { y: [0, -5, 0], transition: { repeat: Infinity, duration: 1 } },
  rainy: { y: [0, 3, 0], transition: { repeat: Infinity, duration: 1.5 } },
  cyberpunk: { x: [-1, 1, -1, 1, 0], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"], transition: { duration: 0.2, repeat: Infinity } },
  spring: { rotate: 360, transition: { duration: 2, ease: "linear", repeat: Infinity } },
  space: { rotate: [0, 5, -5, 0], y: [0, -2, 0], transition: { duration: 2, repeat: Infinity } },
  none: { scale: 1 }
};

const ThemeToggle = () => {
  const { activeOverlay, setActiveOverlay } = useTheme();

  const overlayOptions = [
    { name: 'none', icon: Ban, label: 'Default' },
    { name: 'christmas', icon: Snowflake, label: 'Holiday' },
    { name: 'valentines', icon: Heart, label: 'Love' },
    { name: 'graduation', icon: GraduationCap, label: 'Grad' },
    { name: 'rainy', icon: CloudRain, label: 'Rainy' },
    { name: 'cyberpunk', icon: Zap, label: 'Cyber' },
    { name: 'spring', icon: Flower2, label: 'Spring' },
    { name: 'space', icon: Rocket, label: 'Cosmos' },
  ];

  return (
    <div className="w-full px-1 pb-1">
      <div className="grid grid-cols-2 gap-3">
        {overlayOptions.map((opt) => {
          const isActive = activeOverlay === opt.name;
          const assets = THEME_ASSETS[opt.name] || THEME_ASSETS.none;
          const Icon = opt.icon;
          
          return (
            <motion.button
              key={opt.name}
              variants={containerVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setActiveOverlay(opt.name)}
              className={`
                group relative flex flex-col items-center justify-center py-4 px-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                ${isActive 
                  ? 'bg-white dark:bg-white/10 border-[var(--monet-primary)] shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-sm'
                }
              `}
              style={isActive ? { borderColor: 'var(--monet-primary)' } : {}}
            >
              {/* Active Indicator Glow (Background) */}
              {isActive && (
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundColor: 'var(--monet-primary)' }} 
                />
              )}

              {/* Icon Container (Premium Gradient Look) */}
              <div 
                className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-all duration-300 shadow-md relative z-10
                  bg-gradient-to-br ${assets.gradient}
                `}
              >
                {/* The Icon itself */}
                <motion.div
                  variants={iconVariants}
                  // Only run the animation variant matching the name when HOVERING
                  animate={opt.name} 
                  // But we need to control it so it defaults to idle usually.
                  // framer-motion propagates variants. Parent is "hover", so child looks for "hover".
                  // To fix this: we map parent "hover" to a specific animation via the variants object directly? 
                  // Easier trick: Use a conditional custom prop or simple transition override.
                  // Actually, let's just keep the variant names consistent or utilize the parent state.
                  // Simplified: We set the variant key to the theme name, and pass that as the 'whileHover' target for the icon specifically.
                >
                   {/* We need to override the parent's variant propagation. */}
                   <motion.div
                      variants={{
                          hover: iconVariants[opt.name],
                          idle: iconVariants.idle
                      }}
                   >
                      <Icon 
                        size={22} 
                        strokeWidth={2.5} 
                        className={`drop-shadow-sm ${assets.iconColor}`}
                        fill="currentColor" 
                        fillOpacity={0.2} // Subtle fill for depth
                      />
                   </motion.div>
                </motion.div>
              </div>

              {/* Label */}
              <span 
                className={`
                  text-[11px] font-bold uppercase tracking-wider relative z-10
                  ${isActive ? 'opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-80 group-hover:opacity-100'}
                `}
                style={isActive ? { color: 'var(--monet-primary)' } : {}}
              >
                {opt.label}
              </span>
              
              {/* Active Checkmark Badge */}
              {isActive && (
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm"
                    style={{ backgroundColor: 'var(--monet-primary)' }}
                >
                    ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeToggle;