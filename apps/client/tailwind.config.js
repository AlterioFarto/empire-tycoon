/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        monopoly: {
          brown: '#8B4513',
          'light-blue': '#87CEEB',
          pink: '#FF69B4',
          orange: '#FF8C00',
          red: '#DC143C',
          yellow: '#FFD700',
          green: '#228B22',
          'dark-blue': '#00008B',
        },
      },
    },
  },
  plugins: [],
};
