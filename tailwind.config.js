/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores do tabuleiro realista
        'tray-wood': '#8B6914',
        'tray-wood-dark': '#5D4E37',
        'tray-wood-light': '#A67C52',
        'tray-border': '#4A3728',
        'soil-dark': '#3D2B1F',
        'soil-medium': '#5C4033',
        'soil-light': '#6B4423',
        // Cores da estufa
        'greenhouse-bg': '#1a2f23',
        'greenhouse-metal': '#4A5568',
        'leaf-green': '#228B22',
        'leaf-light': '#32CD32',
      },
      boxShadow: {
        'tray': 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.4)',
        'tray-inner': 'inset 0 4px 8px rgba(0,0,0,0.5)',
        'slot': 'inset 0 2px 6px rgba(0,0,0,0.6)',
        'slot-hover': 'inset 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(34,139,34,0.4)',
      },
      backgroundImage: {
        'soil-texture': "url('/assets/textures/soil.png')",
      },
    },
  },
  plugins: [],
}
