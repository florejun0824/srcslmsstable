import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext'; // Adjust path if needed

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { name: 'light', icon: <Sun className="w-5 h-5" /> },
    { name: 'dark', icon: <Moon className="w-5 h-5" /> },
    { name: 'system', icon: <Monitor className="w-5 h-5" /> },
  ];

  return (
    // --- MODIFIED: Replaced CSS var classes with explicit neumorphic classes ---
    <div className="flex items-center p-1 bg-neumorphic-base rounded-full shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
      {options.map((opt) => (
        <button
          key={opt.name}
          onClick={() => setTheme(opt.name)}
          className={`
            p-2 rounded-full transition-all 
            ${theme === opt.name
              // Active state: Popped out, with a primary color
              ? 'bg-neumorphic-base shadow-neumorphic text-blue-600 dark:bg-neumorphic-base-dark dark:shadow-lg dark:text-blue-400'
              // Inactive state: Flat, standard text color
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }
          `}
          aria-label={`Switch to ${opt.name} theme`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;