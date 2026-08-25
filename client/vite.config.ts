import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // MapLibre ships its tiler as a separate worker entry. The dependency
    // pre-bundler rewrites the import but does not emit the worker file, so
    // GeoJSON sources silently never tile — raster basemaps still draw, which
    // makes it look like a styling problem rather than a missing worker.
    exclude: ['maplibre-gl'],
  },
})
