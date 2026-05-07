/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          green: '#39d353',
          cyan: '#79c0ff',
          yellow: '#e3b341',
          red: '#f85149',
          purple: '#bc8cff',
          text: '#c9d1d9',
          muted: '#8b949e',
        },
        accent: {
          DEFAULT: '#02AD8B',
          light: '#03d9a8',
          dark: '#018a6f',
          glow: 'rgba(2, 173, 139, 0.3)',
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'glow-accent': 'glowAccent 2s ease-in-out infinite',
        'scan-line': 'scanLine 8s linear infinite',
        typing: 'typing 3.5s steps(40, end)',
        'float': 'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { textShadow: '0 0 4px #39d353, 0 0 8px #39d353' },
          '50%': { textShadow: '0 0 12px #39d353, 0 0 24px #39d353, 0 0 40px #39d353' },
        },
        glowAccent: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(2, 173, 139, 0.3), 0 0 20px rgba(2, 173, 139, 0.1)' },
          '50%': { boxShadow: '0 0 16px rgba(2, 173, 139, 0.5), 0 0 40px rgba(2, 173, 139, 0.2)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(57, 211, 83, 0.3)',
        'glow-cyan': '0 0 20px rgba(121, 192, 255, 0.3)',
        'glow-accent': '0 0 20px rgba(2, 173, 139, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
