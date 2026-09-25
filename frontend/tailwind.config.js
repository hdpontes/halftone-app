/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9caff',
          300: '#8ba6ff',
          400: '#5b7bff',
          500: '#3355ff',
          600: '#1a35f5',
          700: '#1226d9',
          800: '#1420b0',
          900: '#151f8a',
          950: '#0e1460',
        },
        dot: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0a',
          700: '#c2570a',
          800: '#9a4510',
          900: '#7c3a12',
        },
        screen: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#18181f',
          600: '#1e1e28',
          500: '#25252f',
          400: '#2d2d3a',
          300: '#3a3a4a',
          200: '#4a4a5e',
          100: '#6b6b82',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'dot-pulse': 'dotPulse 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'fade-up': 'fadeUp 0.5s ease-out both',
      },
      keyframes: {
        dotPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
