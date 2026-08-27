/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pixizen: {
          accent: 'var(--sn-editor-accent, #8b3dff)',
          surface: 'var(--sn-editor-surface, #f5f6f8)',
          border: 'var(--sn-editor-border, #e5e7eb)',
          panel: 'var(--sn-editor-panel, #ffffff)',
        },
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        teal: {
          400: '#a66bff',
          500: '#8b3dff',
          600: 'rgb(var(--teal-600) / <alpha-value>)',
          700: 'rgb(var(--teal-700) / <alpha-value>)',
        },
        fog: {
          50: 'rgb(var(--fog-50) / <alpha-value>)',
          100: 'rgb(var(--fog-100) / <alpha-value>)',
          200: 'rgb(var(--fog-200) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
      },
    },
  },
  plugins: [],
};
