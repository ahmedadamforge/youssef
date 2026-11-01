export const designTokens = {
  brand: {
    name: 'CMC Robotics Club / Rabat',
    source: 'https://robotics.ma/',
    treatment: 'Dark teal surfaces, cyan technical accents, warm orange signal accents, compact editorial typography',
  },
  colors: {
    ink: '#07161E',
    surface: '#0B202A',
    panel: '#102E39',
    panelSoft: '#163946',
    cyan: '#6DD3E7',
    cyanDeep: '#1498AE',
    orange: '#FF8A45',
    mint: '#93E5C0',
    fog: '#D7E6E8',
    muted: '#88A5AD',
    border: 'rgba(157, 213, 224, 0.16)',
  },
  typography: {
    display: 'Geist / Inter, wide tracking, low ornament',
    body: 'Geist / Inter, calm and compact for technical dashboards',
    mono: 'Geist Mono / ui-monospace for serial output and values',
  },
  motion: {
    fast: 0.18,
    standard: 0.32,
    slow: 0.6,
    ease: [0.22, 1, 0.36, 1] as const,
  },
} as const
