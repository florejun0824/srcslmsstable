// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

const ThemeContext = createContext(undefined);

// --- MONET ENGINE CONFIGURATION ---
// Dual palettes: light seeds are soft pastels, dark seeds are deep tones
const THEME_SEEDS_LIGHT = {
  christmas: '#E8F5E9', // Soft Mint
  valentines: '#FCE4EC', // Soft Rose
  graduation: '#FFF8E1', // Soft Gold
  rainy: '#E0F2F1', // Soft Teal
  cyberpunk: '#F3E5F5', // Soft Lavender
  spring: '#FBE9E7', // Soft Peach
  space: '#E8EAF6', // Soft Indigo
  none: '#E8EDF5', // Soft Blue-Gray (Default)
};

const THEME_SEEDS_DARK = {
  christmas: '#0F1742', // Deep Midnight Blue
  valentines: '#4A0A18', // Velvet Red
  graduation: '#2C2408', // Dark Gold
  rainy: '#1A2E22', // Mossy Green
  cyberpunk: '#2D0A35', // Deep Neon Purple
  spring: '#3D1018', // Dark Cherry
  space: '#05050A', // Deep Void
  none: '#1E293B', // Slate 800 (Default)
};

// --- COLOR MATH HELPERS ---
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToRgbString = (h, s, l) => {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `${r}, ${g}, ${b}`;
};

const adjustBrightness = ({ r, g, b }, percent) => {
  return {
    r: Math.min(255, Math.max(0, r + (255 * percent / 100))),
    g: Math.min(255, Math.max(0, g + (255 * percent / 100))),
    b: Math.min(255, Math.max(0, b + (255 * percent / 100)))
  };
};

// Initial State Loaders
const getInitialOverlay = () => {
  if (typeof window !== 'undefined') {
    const storedOverlay = localStorage.getItem('theme_overlay');
    if (storedOverlay) return storedOverlay;
  }
  return 'none';
};

const getInitialMode = () => {
  if (typeof window !== 'undefined') {
    const storedMode = localStorage.getItem('theme_mode');
    if (storedMode) return storedMode;
  }
  return 'full'; // Default to full experience
};

const getInitialDarkMode = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme_dark_mode');
    if (stored !== null) return stored === 'true';
  }
  return false; // Default to light mode
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);
  const theme = isDarkMode ? 'dark' : 'light';
  const [activeOverlay, setActiveOverlayState] = useState(getInitialOverlay);
  const [themeMode, setThemeModeState] = useState(getInitialMode);

  const setActiveOverlay = (newOverlay) => {
    setActiveOverlayState(newOverlay);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_overlay', newOverlay);
    }
  };

  const setThemeMode = (newMode) => {
    setThemeModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_mode', newMode);
    }
  };

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme_dark_mode', String(next));
      }
      return next;
    });
  }, []);

  // Apply dark/light class to <html> root
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [isDarkMode, theme]);

  // --- CALCULATE DYNAMIC PALETTE ---
  const monetTheme = useMemo(() => {
    const seeds = isDarkMode ? THEME_SEEDS_DARK : THEME_SEEDS_LIGHT;
    const seedHex = seeds[activeOverlay] || seeds['none'];
    const rgb = hexToRgb(seedHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const surfaceColor = isDarkMode
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.70)`
      : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
    const borderRgb = adjustBrightness(rgb, isDarkMode ? 30 : -10);
    const borderColor = isDarkMode
      ? `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, 0.25)`
      : `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, 0.15)`;
    const shadowColor = isDarkMode
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`
      : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;

    // PRIMARY ACCENT
    const vibrantRgb = isDarkMode
      ? hslToRgbString(hsl.h, 40, 30)
      : hslToRgbString(hsl.h, 50, 55);
    // DARK ACCENT
    const deepRgb = isDarkMode
      ? hslToRgbString(hsl.h, 50, 10)
      : hslToRgbString(hsl.h, 40, 40);

    const accentColor = `rgb(${vibrantRgb})`;
    const deepAccentColor = `rgb(${deepRgb})`;

    return {
      seedHex,
      rgbString: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      glassStyle: {
        background: surfaceColor,
        borderColor: borderColor,
        boxShadow: `0 8px 32px -4px ${shadowColor}`,
      },
      variables: {
        '--monet-accent': accentColor,
        '--monet-accent-dark': deepAccentColor,
        '--monet-shadow': shadowColor,
        '--monet-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`
      }
    };
  }, [activeOverlay, isDarkMode]);

  const value = {
    theme,
    isDarkMode,
    toggleDarkMode,
    activeOverlay,
    setActiveOverlay,
    themeMode,      // 'full' or 'lite'
    setThemeMode,   // Function to update mode
    monetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};