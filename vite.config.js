import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PAGELY',
        short_name: 'PAGELY',
        description: 'Your personal reading library',
        theme_color: '#7A6244',
        background_color: '#FBF6EA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
  {
    src: '/favicon.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any'
  }
]
      }
    })
  ]
})