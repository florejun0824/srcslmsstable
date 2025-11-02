import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);

// Get the initial theme from localStorage or default to 'system'
const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      return storedTheme;
    }
  }
  return 'system';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (newTheme) => {
      // 1. Save preference to localStorage
      localStorage.setItem('theme', newTheme);
      
      // 2. Apply theme to HTML tag
      if (newTheme === 'system') {
        // Apply system theme
        const systemTheme = systemThemeQuery.matches ? 'dark' : 'light';
        root.classList.remove(systemTheme === 'dark' ? 'light' : 'dark');
        root.classList.add(systemTheme);
      } else {
        // Apply user's direct choice
        root.classList.remove(newTheme === 'dark' ? 'light' : 'dark');
        root.classList.add(newTheme);
      }
    };

    // Listener for system theme changes
    const handleSystemThemeChange = (e) => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    // Apply the theme when the component loads or theme changes
    applyTheme(theme);
    
    systemThemeQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const value = {
    theme,
    setTheme,
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