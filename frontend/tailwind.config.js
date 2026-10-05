/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff4ed',
          100: '#ffe6d5',
          200: '#fec9aa',
          300: '#fda374',
          400: '#fa773d',
          500: '#e8591a',
          600: '#d34a10',
          700: '#af3a10',
          800: '#8b3014',
          900: '#712a14',
          950: '#3d1208',
        },
        ink: {
          DEFAULT: '#1b1b1a',
          soft: '#3d3b37',
        },
        stone: {
          50: '#fbfaf7',
          100: '#f3f1ec',
          200: '#e2ddd3',
          300: '#cfc8bb',
          400: '#a8a195',
          500: '#7a756c',
          600: '#5c5850',
          700: '#3d3b37',
          800: '#262522',
          900: '#1b1b1a',
          950: '#141413',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        lifted: '0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.16)',
        glow: '0 8px 24px -6px rgba(79, 70, 229, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
