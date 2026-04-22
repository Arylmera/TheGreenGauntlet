import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
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
          green: '#00915a',
          deep: '#007a4b',
          forest: '#005a36',
          mint: '#d6ecdf',
        },
        ink: {
          black: '#1a1a1a',
          charcoal: '#4a4a4a',
          mid: '#8c8c8c',
        },
        surface: {
          white: '#ffffff',
          off: '#f5f5f5',
          panel: '#fafafa',
        },
        line: {
          light: '#e6e6e6',
          input: '#c4c4c4',
        },
        semantic: {
          error: '#d0271d',
          warning: '#f5a623',
          info: '#1d72b8',
        },
        medal: {
          gold: '#d4af37',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
        },
      },
      fontFamily: {
        sans: ['BNPPSans', 'Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
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
        'display': ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
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
      },
      animation: {
        flash: 'flash 800ms ease-out',
        'flash-dark': 'flash-dark 800ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
