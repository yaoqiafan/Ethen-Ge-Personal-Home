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
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scan-line': 'scanLine 8s linear infinite',
        typing: 'typing 3.5s steps(40, end)',
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
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(57, 211, 83, 0.3)',
        'glow-cyan': '0 0 20px rgba(121, 192, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
