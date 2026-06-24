import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'IsiVoltPro Refrigeración',
        short_name: 'IsiVolt Refrig.',
        description: 'Herramienta local para técnicos de refrigeración.',
        theme_color: '#06111f',
        background_color: '#06111f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
    }),
  ],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: true, exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'] },
  server: { port: 5175, strictPort: true },
})
