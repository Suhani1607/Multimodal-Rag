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
        canvas: '#0B0A10',
        sidebar: '#100F17',
        surface: {
          DEFAULT: '#171521',
          elevated: '#201D2B',
          muted: '#13111C',
        },
        accent: {
          violet: '#A78BFA',
          'violet-light': '#C4B5FD',
          'violet-dark': '#7C3AED',
          amber: '#F5B544',
          'amber-hover': '#E9A72D',
          'amber-muted': 'rgba(245, 181, 68, 0.15)',
        },
        content: {
          primary: '#F5F3FA',
          secondary: '#A6A0B5',
          muted: '#6B657A',
        },
        border: {
          subtle: '#302B3D',
          highlight: '#4A435C',
          violet: 'rgba(167, 139, 250, 0.3)',
          amber: 'rgba(245, 181, 68, 0.4)',
        },
        status: {
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#FB7185',
          info: '#93C5FD',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 20px -5px rgba(167, 139, 250, 0.25)',
        'glow-amber': '0 0 20px -5px rgba(245, 181, 68, 0.3)',
      }
    },
  },
  plugins: [],
}
