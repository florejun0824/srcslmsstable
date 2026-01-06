// src/components/common/ThemeToggle.jsx
import React from 'react';
import { 
  Snowflake, 
  Heart, 
  GraduationCap, 
  Ban,
  Palette,
  CloudRain,
  Zap,
  Flower2,
  Rocket
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { activeOverlay, setActiveOverlay } = useTheme();

  const overlayOptions = [
    { name: 'none', icon: <Ban className="w-5 h-5" />, label: 'Standard' },
    { name: 'christmas', icon: <Snowflake className="w-5 h-5" />, label: 'Christmas' },
    { name: 'valentines', icon: <Heart className="w-5 h-5" />, label: 'Valentines' },
    { name: 'graduation', icon: <GraduationCap className="w-5 h-5" />, label: 'Graduation' },
    { name: 'rainy', icon: <CloudRain className="w-5 h-5" />, label: 'Rainy' },
    { name: 'cyberpunk', icon: <Zap className="w-5 h-5" />, label: 'Cyberpunk' },
    { name: 'spring', icon: <Flower2 className="w-5 h-5" />, label: 'Spring' },
    { name: 'space', icon: <Rocket className="w-5 h-5" />, label: 'Deep Space' },
  ];

  return (
    <div className="flex flex-col w-full">
      
      {/* Ambience Grid */}
      <div className="grid grid-cols-2 gap-2.5 p-2">
        {overlayOptions.map((opt) => {
          const isActive = activeOverlay === opt.name;
          
          return (
            <button
              key={opt.name}
              onClick={() => setActiveOverlay(opt.name)}
              className={`
                relative flex items-center gap-3 p-3 rounded-[20px] transition-all duration-300 group overflow-hidden
                ${isActive 
                  ? 'text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] scale-[1.02]' 
                  : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 hover:scale-[1.01]'
                }
              `}
              // Apply Dynamic Monet Accent Color for Active State
              style={isActive ? { backgroundColor: 'var(--monet-accent)' } : {}}
              title={`Activate ${opt.label} Theme`}
            >
              {/* Icon Container */}
              <div className={`
                p-1.5 rounded-[12px] transition-colors duration-300
                ${isActive 
                  ? 'bg-white/20' 
                  : 'bg-white dark:bg-white/5 shadow-sm group-hover:bg-white dark:group-hover:bg-white/10'
                }
              `}>
                {React.cloneElement(opt.icon, { 
                  strokeWidth: isActive ? 2.5 : 2 
                })}
              </div>

              {/* Label */}
              <span className={`
                text-[11px] font-bold uppercase tracking-wide leading-none
                ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'}
              `}>
                {opt.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeToggle;