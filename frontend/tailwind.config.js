/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: "#2ECC71",
            dark: "#16A34A",
            light: "#A7F3D0",
            soft: "#F0FDF4",
          },
          yellow: {
            DEFAULT: "#FACC15",
            light: "#FDE047",
            soft: "#FEFCE8",
          },
          pink: {
            DEFAULT: "#F472B6",
            light: "#FB7185",
            soft: "#FDF2F8",
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
