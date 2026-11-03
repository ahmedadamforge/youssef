import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101418',
        surface: '#191f25',
        panel: '#232c34',
        cyan: '#62DAD2',
        cyanDeep: '#20B8AE',
        orange: '#FF8A45',
        mint: '#93E5C0',
        fog: '#E4EBEF',
        muted: '#A0AFBA',
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
