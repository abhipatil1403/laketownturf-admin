/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkNavy: '#0F172A',
        darkNavySurface: '#1E293B',
        primaryGreen: '#10B981',
        cardBorder: '#334155',
        amberCTA: '#F59E0B',
        dangerRed: '#EF4444',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8'
      }
    },
  },
  plugins: [],
}
