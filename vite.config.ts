import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Repo name -> deploy path. GITHUB_REPOSITORY is set automatically in CI.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'kb-solo'
const base = process.env.BASE_PATH ?? `/${repo}/`

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'KB Solo',
        short_name: 'KB Solo',
        description: 'Learn to touch type — English and Russian, offline',
        // id/scope/start_url default to `base`; do NOT hardcode '/'
        id: base,
        theme_color: '#111318',
        background_color: '#111318',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: true,
        type: 'classic',
        navigateFallbackAllowlist: [/^\/kb-solo\//],
        suppressWarnings: true,
      },
    }),
  ],
  build: { outDir: 'dist', assetsDir: 'assets' },
})
