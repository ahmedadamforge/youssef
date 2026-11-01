import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07161E',
        surface: '#0B202A',
        panel: '#102E39',
        cyan: '#6DD3E7',
        cyanDeep: '#1498AE',
        orange: '#FF8A45',
        mint: '#93E5C0',
        fog: '#D7E6E8',
        muted: '#88A5AD',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
      boxShadow: {
        glow: '0 0 50px rgba(109,211,231,0.12)',
        cyan: '0 0 24px rgba(109,211,231,0.2)',
      },
    },
  },
  plugins: [],
}

export default config
