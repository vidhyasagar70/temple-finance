/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        temple: {
          50: '#fffbf5',
          100: '#fcf3e6',
          200: '#f8e4c7',
          300: '#f3d09e',
          400: '#ebaf69',
          500: '#e48b39',
          600: '#d56f27',
          700: '#b1501f',
          800: '#8e3f20',
          900: '#73351d',
        },
        maroon: {
          50: '#fdf2f2',
          100: '#fde8e8',
          600: '#9b1c1c',
          700: '#771d1d',
          800: '#581c1c',
        },
        forest: {
          50: '#f0f7f4',
          100: '#dbece4',
          600: '#285447',
          700: '#1e4036',
          800: '#163028',
        }
      }
    },
  },
  plugins: [],
}
