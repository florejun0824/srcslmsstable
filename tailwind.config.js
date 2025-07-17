module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Make sure this path matches your project structure
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f0f5ff',
          '100': '#e0e9ff',
          '200': '#c8d7ff',
          '300': '#a3baff',
          '400': '#7b9bff',
          '500': '#5276ff',
          '600': '#385ef8',
          '700': '#2556e0',
          '800': '#1d45b3',
          '900': '#183a8f',
          '950': '#102661',
        },
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};