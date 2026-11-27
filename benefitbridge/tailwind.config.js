/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#dde6f4',
          200: '#c0d0eb',
          300: '#94b0dc',
          400: '#6288c8',
          500: '#3f67b3',
          600: '#2e4f97',
          700: '#1e3470',
          800: '#162650',
          900: '#0f1a38',
          950: '#090f22',
        },
        teal: {
          50:  '#f0faf8',
          100: '#d9f2ed',
          200: '#b3e5db',
          300: '#7dd0c3',
          400: '#45b5a5',
          500: '#2a9a8b',
          600: '#1f7d71',
          700: '#1a645b',
          800: '#174f49',
          900: '#15413d',
        },
        neutral: {
          25: '#fafaf9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'skeleton': 'skeleton 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        skeleton: { '0%, 100%': { opacity: '1' },                        '50%': { opacity: '0.45' } },
      },
    },
  },
  plugins: [],
}
