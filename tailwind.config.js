/** @type {import('tailwindcss').Config} */
const rgb = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: rgb('ink-950'),
          900: rgb('ink-900'),
          850: rgb('ink-850'),
          800: rgb('ink-800'),
          750: rgb('ink-750'),
          700: rgb('ink-700'),
          600: rgb('ink-600')
        },
        ion: {
          DEFAULT: rgb('ion'),
          soft: rgb('ion-soft'),
          deep: rgb('ion-deep')
        },
        volt: {
          DEFAULT: rgb('volt'),
          soft: rgb('volt-soft'),
          deep: rgb('volt-deep')
        },
        muted: rgb('muted'),
        white: rgb('white'),
        slate: {
          100: rgb('slate-100'),
          200: rgb('slate-200'),
          300: rgb('slate-300'),
          400: rgb('slate-400'),
          500: rgb('slate-500'),
          600: rgb('slate-600'),
          700: rgb('slate-700'),
          800: rgb('slate-800'),
          900: rgb('slate-900'),
          950: rgb('slate-950')
        }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace']
      },
      boxShadow: {
        glow: '0 0 32px -8px rgba(59,167,255,0.45)',
        voltglow: '0 0 32px -8px rgba(61,245,165,0.4)',
        panel: '0 24px 60px -28px rgba(0,0,0,0.85)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        breathe: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.3s ease both',
        breathe: 'breathe 7s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'spin-slow': 'spin-slow 9s linear infinite'
      }
    }
  },
  plugins: []
}
