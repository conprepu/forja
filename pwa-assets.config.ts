import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run icons` regenera los PNG de public/ a partir de public/icon.svg.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#06070a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#06070a' } },
  },
  images: ['public/icon.svg'],
})
