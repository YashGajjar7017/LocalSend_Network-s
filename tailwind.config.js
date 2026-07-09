/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
          glow: 'var(--color-accent-glow)',
        },
        themeBg: 'var(--color-bg-base)',
        themePanel: 'var(--color-bg-panel)',
        themeCard: 'var(--color-bg-card)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
