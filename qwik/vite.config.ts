import { qwikVite } from '@qwik.dev/core/optimizer'
import { qwikRouter } from '@qwik.dev/router/vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
    publicDir: '../public',
    plugins: [qwikRouter(), qwikVite(), UnoCSS()],
    optimizeDeps: {
      exclude: [],
    },
    server: {
      fs: {
        allow: ['..'],
      },
      headers: {
        'Cache-Control': 'public, max-age=0',
      },
    },
    preview: {
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    },
  }
})
