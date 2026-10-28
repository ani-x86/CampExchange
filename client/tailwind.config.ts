import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: '#FAFAFA',
        line: '#E5E5E5',
        lineStrong: '#CFCFCF',
        ink: '#111111',
        mute: '#6B6B6B',
        faint: '#9A9A9A',
        accent: {
          DEFAULT: '#2F5BFF',
          hover: '#1F46D6',
          soft: '#EEF2FF',
        },
        ok: '#13795B',
        warn: '#B45309',
        danger: '#C62828',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.22,.61,.36,1)',
      },
      screens: {
        xs: '400px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
    },
  },
  plugins: [],
} satisfies Config;
