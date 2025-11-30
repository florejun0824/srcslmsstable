// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);

// Helper to get the initial Seasonal Overlay Preference
const getInitialOverlay = () => {
  if (typeof window !== 'undefined') {
    const storedOverlay = localStorage.getItem('theme_overlay');
    if (storedOverlay) return storedOverlay;
  }
  return 'none';
};

export const ThemeProvider = ({ children }) => {
  // --- State ---
  // 1. Theme is ALWAYS 'dark'. We no longer toggle it.
  const theme = 'dark'; 

  // 2. Seasonal Overlay Logic (Remains unchanged)
  const [activeOverlay, setActiveOverlayState] = useState(getInitialOverlay);

  const setActiveOverlay = (newOverlay) => {
    setActiveOverlayState(newOverlay);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_overlay', newOverlay);
    }
  };

  // --- Effect: Enforce Dark Mode Globally ---
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove 'light' just in case, and force 'dark'
    root.classList.remove('light');
    root.classList.add('dark');
    
    // Optional: Save to localStorage so if you ever revert, it remembers
    localStorage.setItem('theme', 'dark');
  }, []);

  const value = {
    theme,             // Always 'dark'
    activeOverlay,     // 'none', 'christmas', 'valentines', 'graduation'
    setActiveOverlay,  // Function to change ambience
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