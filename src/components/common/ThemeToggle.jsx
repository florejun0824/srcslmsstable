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
    { name: 'none', icon: <Ban className="w-4 h-4" />, label: 'Standard' },
    { name: 'christmas', icon: <Snowflake className="w-4 h-4" />, label: 'Christmas' },
    { name: 'valentines', icon: <Heart className="w-4 h-4" />, label: 'Valentines' },
    { name: 'graduation', icon: <GraduationCap className="w-4 h-4" />, label: 'Graduation' },
    { name: 'rainy', icon: <CloudRain className="w-4 h-4" />, label: 'Rainy' },
    { name: 'cyberpunk', icon: <Zap className="w-4 h-4" />, label: 'Cyberpunk' },
    { name: 'spring', icon: <Flower2 className="w-4 h-4" />, label: 'Spring' },
    { name: 'space', icon: <Rocket className="w-4 h-4" />, label: 'Deep Space' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-800/90 rounded-2xl border border-white/10 backdrop-blur-md min-w-[240px]">
      
      {/* Title */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Palette className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Ambience</span>
      </div>

      {/* Ambience Selection Grid */}
      <div className="grid grid-cols-2 gap-2">
        {overlayOptions.map((opt) => (
          <button
            key={opt.name}
            onClick={() => setActiveOverlay(opt.name)}
            className={`
              flex items-center justify-start gap-3 p-2.5 rounded-xl transition-all duration-300 group
              ${activeOverlay === opt.name
                ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }
            `}
            title={`Activate ${opt.label} Theme`}
          >
            <div className={`
              p-1.5 rounded-lg transition-colors
              ${activeOverlay === opt.name ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-600'}
            `}>
              {opt.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">{opt.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
};

export default ThemeToggle;