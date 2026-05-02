/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Editorial warm palette
        paper: '#faf7f2',          // light bg
        ink: '#0e0c0a',            // dark bg (warm near-black)
        accent: {
          50: '#fbf2ed',
          100: '#f5dfd2',
          200: '#ecc1ad',
          300: '#dd9a7d',
          400: '#c66e4d',
          500: '#a42c25',
          600: '#8e2520',
          700: '#74201c',
          800: '#5a1a17',
        },
      },
    },
  },
  plugins: [],
};
