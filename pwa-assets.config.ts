import {
  defineConfig,
  minimal2023Preset as preset
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset: {
    ...preset,
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: {
        background: 'transparent',
        fit: 'cover',
      },
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: {
        background: 'transparent',
        fit: 'cover',
      },
    },
  },
  images: ['public/icon.png'],
})
