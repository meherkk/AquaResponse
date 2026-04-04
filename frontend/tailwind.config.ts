import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0a0c14',
          surface: '#111827',
          border: '#1e2535',
          muted: '#374151',
        },
        risk: {
          0: '#1e3a5f',
          1: '#155e75',
          2: '#15803d',
          3: '#ca8a04',
          4: '#c2410c',
          5: '#7f1d1d',
        },
        water: {
          hydrant: '#38bdf8',
          lake: '#1d4ed8',
          stream: '#7dd3fc',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
