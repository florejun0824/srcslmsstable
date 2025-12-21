/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
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
        // --- Neumorphic UI Colors (Legacy) ---
        'neumorphic-base': '#F0F2F5',
        'neumorphic-shadow-dark': '#C8CDD3',
        'neumorphic-shadow-light': '#FFFFFF',
        'neumorphic-base-dark': '#1e293b',
        'neumorphic-shadow-dark-dark': '#0f172a',
        'neumorphic-shadow-light-dark': '#334155',
      },
      // --- NEW: Holographic Backgrounds ---
      backgroundImage: {
        'glass-shine': 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
        'gradient-border': 'linear-gradient(var(--monet-accent), var(--monet-accent-dark))', 
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        blob: "blob 7s infinite",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        // --- NEW: Holographic Animations ---
        'border-flow': 'borderFlow 3s ease infinite',
        'aurora': 'aurora 10s ease infinite',
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
        // --- NEW: Holographic Keyframes ---
        borderFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        aurora: {
          '0%': { backgroundPosition: '50% 50%', filter: 'hue-rotate(0deg)' },
          '100%': { backgroundPosition: '350% 50%', filter: 'hue-rotate(360deg)' },
        },
      },
      boxShadow: {
        // Existing Shadows
        'sm-floating-xs': '0 2px 8px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.05)',
        'md-floating-xs': '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
        'lg-floating-sm': '0 8px 20px rgba(0, 0, 0, 0.1), 0 0 2px rgba(0, 0, 0, 0.08)',
        'xl-floating-md': '0 12px 28px rgba(0, 0, 0, 0.12), 0 0 3px rgba(0, 0, 0, 0.1)',
        '2xl-floating-lg': '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 4px rgba(0, 0, 0, 0.12)',
        '3xl-floating-xl': '0 30px 60px rgba(0, 0, 0, 0.2), 0 0 5px rgba(0, 0, 0, 0.15)',
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        
        // Legacy Neumorphic (Keep for backward compatibility)
        'neumorphic': '6px 6px 12px #C8CDD3, -6px -6px 12px #FFFFFF',
        'neumorphic-inset': 'inset 6px 6px 12px #C8CDD3, inset -6px -6px 12px #FFFFFF',
        'neumorphic-flat-inset': 'inset 2px 2px 4px #C8CDD3, inset -2px -2px 4px #FFFFFF',
        'neumorphic-dark': '6px 6px 12px #0f172a, -6px -6px 12px #334155',
        'neumorphic-inset-dark': 'inset 6px 6px 12px #0f172a, inset -6px -6px 12px #334155',
        'neumorphic-flat-inset-dark': 'inset 2px 2px 4px #0f172a, inset -2px -2px 4px #334155',

        // --- NEW: Holographic Glass Shadows (Use these instead of Neumorphic) ---
        'glass-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glass-md': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glow-accent': '0 0 20px -5px var(--monet-accent)',
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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            blockquote: {
              fontWeight: '500',
              fontStyle: 'italic',
              color: theme('colors.slate.600'),
              borderLeftWidth: '0.25rem',
              borderLeftColor: theme('colors.sky.400'),
              quotes: '"\\201C""\\201D""\\2018""\\2019"',
              paddingLeft: theme('spacing.4'),
              backgroundColor: theme('colors.neumorphic-base'),
              paddingTop: theme('spacing.2'),
              paddingBottom: theme('spacing.2'),
              paddingRight: theme('spacing.4'),
              borderRadius: theme('borderRadius.lg'),
              boxShadow: theme('boxShadow.neumorphic-flat-inset'),
            },
            'blockquote p:first-of-type::before': {
              content: '',
            },
            'blockquote p:last-of-type::after': {
              content: '',
            },
          },
        },
        invert: {
          css: {
            blockquote: {
              color: theme('colors.slate.400'),
              backgroundColor: theme('colors.neumorphic-base-dark'),
              boxShadow: theme('boxShadow.neumorphic-flat-inset-dark'),
            },
          },
        },
      }),
    },
  },
  safelist: [
    'to-blue-50',
    'to-green-50',
    'to-amber-50',
    'to-red-50',
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