/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// The browser calls the backend at VITE_API_URL (client/.env or the
// environment) for /api/v1 and /media. There is deliberately no default: a
// missing value stops dev, preview and build instead of silently pointing the
// site at the wrong server. If it is a different origin from the site, list the
// site in the backend's CORS_ORIGINS; keep both on the same site (domain or
// subdomain) so the SameSite=Strict refresh cookie is sent.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode !== 'test' && !env.VITE_API_URL?.trim()) {
    throw new Error('VITE_API_URL is not set. Add it to client/.env, e.g. VITE_API_URL=https://api.example.com')
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { port: 5173 },
    preview: { port: 4173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      env: { VITE_API_URL: 'http://api.test' },
    },
  }
})
