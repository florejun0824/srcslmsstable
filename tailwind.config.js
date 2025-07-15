/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This line is crucial
    // Add other paths if you have components elsewhere
  ],
  theme: {
    extend: {
      fontFamily: {
        // Add 'Inter' or your preferred modern sans-serif font
        sans: ['Inter', 'sans-serif'], 
      },
      colors: {
        // Define a primary color for consistent use
        primary: {
          50: '#eff6ff',
          100: '#e0edff',
          200: '#c0daff',
          300: '#a0c7ff',
          400: '#75a8ff',
          500: '#4f8bff', // Slightly softer blue than default 600
          600: '#346eff',
          700: '#2556e0',
          800: '#1d45b3',
          900: '#183a8f',
          950: '#102661',
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};