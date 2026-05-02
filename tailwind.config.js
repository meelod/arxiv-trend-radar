/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        accent: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#a42c25',
          600: '#8e2520',
        },
      },
    },
  },
  plugins: [],
};
