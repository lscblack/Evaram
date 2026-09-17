import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Uploaded media lives on the API, but every stored URL is a relative
      // `/media/…` — correct in production, where one host serves both, and a
      // 404 in development, where the browser resolves it against Vite. The
      // proxy makes the dev origin behave like production. See server/README.md
      // for the matching nginx rule.
      proxy: {
        '/media': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      // MapLibre ships its tiler as a separate worker entry. The dependency
      // pre-bundler rewrites the import but does not emit the worker file, so
      // GeoJSON sources silently never tile — raster basemaps still draw, which
      // makes it look like a styling problem rather than a missing worker.
      exclude: ['maplibre-gl'],
    },
  }
})
