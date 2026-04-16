/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          900: '#0b0e14',
          800: '#111620',
          700: '#181d2a',
          600: '#1f2637',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          glow: 'rgba(99, 102, 241, 0.35)',
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#f87171',
          glow: 'rgba(239, 68, 68, 0.35)',
        },
        success: '#22c55e',
        warning: '#f59e0b',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        'speaking': 'speaking 1.2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.15)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'speaking': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(34, 197, 94, 0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
