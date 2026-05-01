/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          purple: '#7C3AED',
          pink: '#EC4899',
          cyan: '#06B6D4',
          gold: '#F59E0B',
          dark: '#0A0A0F',
          card: '#111118',
          border: '#1E1E2E',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'score-pop': 'scorePop 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideUp: { from: { transform: 'translateY(100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.8)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        glowPulse: { '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)' }, '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.9)' } },
        scorePop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.3)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
