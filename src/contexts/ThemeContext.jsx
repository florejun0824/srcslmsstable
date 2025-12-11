// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const ThemeContext = createContext(undefined);

// --- MONET ENGINE CONFIGURATION ---
const THEME_SEEDS = {
    christmas:  '#0F1742', // Deep Midnight Blue
    valentines: '#4A0A18', // Velvet Red
    graduation: '#2C2408', // Dark Gold
    rainy:      '#1A2E22', // Mossy Green
    cyberpunk:  '#2D0A35', // Deep Neon Purple
    spring:     '#3D1018', // Dark Cherry
    space:      '#05050A', // Deep Void
    none:       '#1E293B', // Slate 800 (Default)
};

// --- COLOR MATH HELPERS ---

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

// Convert RGB to HSL
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

// Convert HSL back to RGB
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

// Helper: Adjust Brightness for simple tints
const adjustBrightness = ({ r, g, b }, percent) => {
    return {
        r: Math.min(255, Math.max(0, r + (255 * percent / 100))),
        g: Math.min(255, Math.max(0, g + (255 * percent / 100))),
        b: Math.min(255, Math.max(0, b + (255 * percent / 100)))
    };
};

const getInitialOverlay = () => {
  if (typeof window !== 'undefined') {
    const storedOverlay = localStorage.getItem('theme_overlay');
    if (storedOverlay) return storedOverlay;
  }
  return 'none';
};

export const ThemeProvider = ({ children }) => {
  const theme = 'dark'; 
  const [activeOverlay, setActiveOverlayState] = useState(getInitialOverlay);

  const setActiveOverlay = (newOverlay) => {
    setActiveOverlayState(newOverlay);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_overlay', newOverlay);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // --- CALCULATE DYNAMIC PALETTE ---
  const monetTheme = useMemo(() => {
      const seedHex = THEME_SEEDS[activeOverlay] || THEME_SEEDS['none'];
      const rgb = hexToRgb(seedHex);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

      // 1. Surface (Background Glass)
      const surfaceColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.70)`;
      const borderRgb = adjustBrightness(rgb, 30);
      const borderColor = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, 0.25)`;
      const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;

      // 2. PRIMARY ACCENT (MOODY & MATTE)
      // Saturation: 40% (Low saturation creates a "Metallic/Matte" look)
      // Lightness: 30% (Dark enough to blend, bright enough for white text)
      const vibrantRgb = hslToRgbString(hsl.h, 40, 30); 
      
      // 3. DARK ACCENT (For Gradient Bottoms)
      // Saturation: 50%
      // Lightness: 10% (Near black, creates deep shadow)
      const deepRgb = hslToRgbString(hsl.h, 50, 10);

      const accentColor = `rgb(${vibrantRgb})`;
      const deepAccentColor = `rgb(${deepRgb})`;

      return {
          seedHex,
          // Styles for Glass Headers
          glassStyle: {
              background: surfaceColor,
              borderColor: borderColor,
              boxShadow: `0 8px 32px -4px ${shadowColor}`,
          },
          // CSS Variables for Global Usage
          variables: {
              '--monet-accent': accentColor,
              '--monet-accent-dark': deepAccentColor, 
              '--monet-shadow': shadowColor,
              '--monet-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`
          }
      };
  }, [activeOverlay]);

  const value = {
    theme,             
    activeOverlay,    
    setActiveOverlay,
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