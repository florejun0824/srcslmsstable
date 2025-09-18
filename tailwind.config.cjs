/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}", // Tremor components
  ],
  theme: {
    extend: {
      colors: {
        // --- Primary Colors ---
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
        // --- Tremor UI Colors ---
        'tremor-brand': {
          faint: '#eff6ff',
          muted: '#bfdbfe',
          subtle: '#60a5fa',
          DEFAULT: '#3b82f6',
          emphasis: '#1d4ed8',
          inverted: '#ffffff',
        },
        'tremor-background': {
          muted: '#f9fafb',
          subtle: '#f3f4f6',
          DEFAULT: '#ffffff',
          emphasis: '#374151',
        },
        'tremor-border': {
          DEFAULT: '#e5e7eb',
        },
        'tremor-ring': {
          DEFAULT: '#e5e7eb',
        },
        'tremor-content': {
          subtle: '#9ca3af',
          DEFAULT: '#6b7280',
          emphasis: '#374151',
          strong: '#111827',
          inverted: '#ffffff',
        },
        // --- Custom Reds ---
        red: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        blob: "blob 7s infinite",
        "scale-in": "scaleIn 0.3s ease-out forwards",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95) translateY(-5px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0px)" },
        },
      },
      boxShadow: {
        'sm-floating-xs': '0 2px 8px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.05)',
        'md-floating-xs': '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
        'lg-floating-sm': '0 8px 20px rgba(0, 0, 0, 0.1), 0 0 2px rgba(0, 0, 0, 0.08)',
        'xl-floating-md': '0 12px 28px rgba(0, 0, 0, 0.12), 0 0 3px rgba(0, 0, 0, 0.1)',
        '2xl-floating-lg': '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 4px rgba(0, 0, 0, 0.12)',
        '3xl-floating-xl': '0 30px 60px rgba(0, 0, 0, 0.2), 0 0 5px rgba(0, 0, 0, 0.15)',
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      fontFamily: {
        sans: ['"Inter var"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "tremor-label": ['0.75rem'],
        "tremor-default": ['0.875rem', { lineHeight: '1.25rem' }],
        "tremor-title": ['1.125rem', { lineHeight: '1.75rem' }],
        "tremor-metric": ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  safelist: [
    {
      pattern: /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    { pattern: /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/ },
    { pattern: /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/ },
    { pattern: /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/ },
  ],
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
};
