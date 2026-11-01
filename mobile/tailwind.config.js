/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ink: '#07161E', surface: '#0B202A', panel: '#102E39', cyan: '#6DD3E7', orange: '#FF8A45', mint: '#93E5C0', fog: '#D7E6E8', muted: '#88A5AD' },
    },
  },
  plugins: [],
}
