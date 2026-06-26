/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Export_AI module palette (additive — does not affect existing styles).
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d6e4f5',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e3a8a',
          900: '#0f1f3d',
        },
      },
    },
  },
  plugins: [],
}