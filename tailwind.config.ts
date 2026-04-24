import type { Config } from 'tailwindcss';

const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        dark: {
          page: '#0b0f14',
          card: '#141a21',
          hover: '#1a2128',
          line: '#2a3038',
          text: '#f5f5f5',
          mid: '#a8b0b8',
          dim: '#6b7178',
        },
        brand: {
          green: withVar('--accent'),
          deep: '#007a4b',
          forest: '#005a36',
          mint: '#d6ecdf',
        },
        ink: {
          black: withVar('--text'),
          charcoal: withVar('--text-mid'),
          mid: withVar('--text-dim'),
        },
        surface: {
          white: withVar('--card'),
          off: withVar('--page'),
          panel: withVar('--panel'),
        },
        line: {
          light: withVar('--line'),
          input: '#c4c4c4',
        },
        semantic: {
          error: '#d0271d',
          warning: '#f5a623',
          info: '#1d72b8',
        },
        medal: {
          gold: withVar('--medal-gold'),
          silver: withVar('--medal-silver'),
          bronze: withVar('--medal-bronze'),
        },
        mario: {
          sky: '#5c94fc',
          parchment: '#f8f4e3',
          brick: '#b53120',
          brickLight: '#e52521',
          pipe: '#00a800',
          pipeDark: '#007a00',
          coin: '#ffd700',
          star: '#ffea00',
        },
      },
      fontFamily: {
        sans: ['BNPPSans', 'Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'BNPPSans', 'monospace'],
      },
      boxShadow: {
        'lvl-1': 'rgba(0, 0, 0, 0.06) 0px 1px 2px',
        'lvl-2': 'rgba(0, 0, 0, 0.08) 0px 2px 8px',
        'lvl-3': 'rgba(0, 0, 0, 0.12) 0px 4px 16px',
        'lvl-4': 'rgba(0, 0, 0, 0.14) 0px 8px 24px',
        'focus-ring': 'rgba(0, 145, 90, 0.25) 0px 0px 0px 3px',
      },
      borderRadius: {
        sharp: '0px',
        subtle: '2px',
        standard: '4px',
        comfy: '8px',
        rounded: '12px',
      },
      screens: {
        tv: '1920px',
      },
      fontSize: {
        display: ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'page-title': ['clamp(1.5rem, 2.5vw, 2rem)', { lineHeight: '1.2', fontWeight: '700' }],
        'numeric-xl': ['clamp(1.5rem, 3vw, 2.75rem)', { lineHeight: '1.1', fontWeight: '700' }],
        'numeric-lg': ['clamp(1.25rem, 2vw, 1.75rem)', { lineHeight: '1.1', fontWeight: '700' }],
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: '#d6ecdf' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-dark': {
          '0%': { backgroundColor: '#1f3a2d' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-mario': {
          '0%': { backgroundColor: '#ffea00' },
          '100%': { backgroundColor: 'transparent' },
        },
        'mario-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-8px) scale(1.04)' },
          '60%': { transform: 'translateY(0) scale(0.98)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(20deg)' },
        },
      },
      animation: {
        flash: 'flash 800ms ease-out',
        'flash-dark': 'flash-dark 800ms ease-out',
        'flash-mario': 'flash-mario 800ms ease-out',
        'mario-bounce': 'mario-bounce 500ms ease-out',
        twinkle: 'twinkle 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
