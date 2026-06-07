import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* New Premium Color System */
        cyan: {
          DEFAULT: '#06B6D4',
          dark: '#0891B2',
          light: '#22D3EE',
          50: 'rgba(6, 182, 212, 0.05)',
          100: 'rgba(6, 182, 212, 0.1)',
          200: 'rgba(6, 182, 212, 0.2)',
        },
        violet: {
          DEFAULT: '#8B5CF6',
          600: '#7C3AED',
        },
        surface: '#1A1F2E',
        elevated: '#242D3D',
        primary: '#0A0E14',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
        md: '0 4px 16px rgba(0, 0, 0, 0.4)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
        xl: '0 12px 32px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(6, 182, 212, 0.2)',
        'glow-lg': '0 0 40px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
}
export default config
