import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel 部署建议用 '/', 这样 PWA 路径最稳
  base: '/',
  plugins: [
    react(),
    tailwindcss(), // 保留你加的 tailwind
    basicSsl(), // 🔒 启用本地 HTTPS 证书

    // 👇 把这个 PWA 插件加回来，手机才能识别它是个 App
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'HoshinoOS',
        short_name: 'HOS',
        description: 'HoshinoOS PWA',
        theme_color: '#ffffff',

        // 🔥 这里的 / 是解决 404 的关键
        start_url: '/',
        scope: '/',

        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: true,
    proxy: {
      '/music-api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false, // 忽略 SSL 证书问题
        rewrite: (path) => path.replace(/^\/music-api/, '')
      }
    }
  }
})
