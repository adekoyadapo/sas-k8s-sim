/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      container: { center: true, padding: '1rem' },
      colors: {
        border: "hsl(214 32% 91%)",
        ring: "hsl(215 20% 65%)",
        background: "#ffffff",
        foreground: "#0b1220",
        primary: {
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f4f6f8",
          foreground: "#667085",
        },
        brand: {
          50: '#e6f3ff',
          100: '#cfe8ff',
          200: '#9fd1ff',
          300: '#6fbaff',
          400: '#3fa3ff',
          500: '#0b8cff',
          600: '#0074e6',
          700: '#005bb4',
          800: '#004282',
          900: '#002951',
        },
      },
      borderRadius: { lg: '12px' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
