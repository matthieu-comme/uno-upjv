import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        headers: { origin: 'http://localhost:5173' },
      },
      '/ws-uno-upjv': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        headers: { origin: 'http://localhost:5173' },
      },
    },
  },
});