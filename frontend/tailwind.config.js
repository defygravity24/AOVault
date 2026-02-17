/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm Gray/Charcoal palette - sophisticated and cozy
        'charcoal': {
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#818181',
          500: '#666666', // Primary charcoal
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#1a1a1a',
        },
        'warm': {
          50: '#faf9f7',
          100: '#f5f3f0',
          200: '#e8e4de',
          300: '#d4cec4',
          400: '#b8b0a3',
          500: '#9c9385', // Warm gray
          600: '#7d756a',
          700: '#655e55',
          800: '#504a43',
          900: '#3d3833',
        },
        // Keep some accent colors for status indicators
        'accent': {
          gold: '#c9a959',     // Warm gold for favorites/premium feel
          sage: '#7d9c7a',     // Sage green for success/complete
          rose: '#c97d7d',     // Dusty rose for hearts/favorites
          slate: '#7d8c9c',    // Slate blue for links
        },
        'vault': {
          bg: '#121212',      // Deep charcoal background
          card: '#1e1e1e',    // Card background
          border: '#2d2d2d',  // Subtle borders
          text: '#e0e0e0',    // Light text
          muted: '#9e9e9e',   // Muted text
          accent: '#c9a959',  // Warm gold accent
          success: '#7d9c7a', // Sage green
          warning: '#d4a54a', // Warm amber
          error: '#c97d7d',   // Dusty rose
        }
      },
      fontFamily: {
        'serif': ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'vault': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'vault-lg': '0 16px 70px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
