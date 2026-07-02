/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#08070F',
          card: 'rgba(15, 14, 28, 0.4)',
          unvisited: '#1A1829',
          frontier: '#FF007A',
          visited: '#00F0FF',
          target: '#39FF14',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-frontier': '0 0 15px rgba(255, 0, 122, 0.6)',
        'glow-visited': '0 0 15px rgba(0, 240, 255, 0.6)',
        'glow-target': '0 0 15px rgba(57, 255, 20, 0.6)',
      }
    },
  },
  plugins: [],
}
