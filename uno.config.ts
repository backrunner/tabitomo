import { defineConfig, presetWind, presetTypography, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetWind(), // Tailwind-compatible preset
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(), // Support @apply, @screen, etc.
  ],
  theme: {
    colors: {
      indigo: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
        950: '#1e1b4b',
      },
      purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
        950: '#3b0764',
      },
    },
  },
  shortcuts: {
    // Flat shadow button
    'cute-shadow': 'shadow-[0_4px_0_rgba(0,0,0,0.1)] translate-y-0 transition-all duration-200 active:shadow-[0_2px_0_rgba(0,0,0,0.1)] active:translate-y-2px',
    // Pop effect for buttons
    'btn-pop': 'transition-transform duration-200 active:scale-95',
  },
  rules: [
    // Custom rule for translate-y-2px
    ['translate-y-2px', { transform: 'translateY(2px)' }],
  ],
})
