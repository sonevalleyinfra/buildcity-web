import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { resolveTarget, assertOverrides } from './scripts/bc-target.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = resolveTarget(process.env, mode)
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
  assertOverrides(target, {
    VITE_API_URL: process.env.VITE_API_URL ?? fileEnv.VITE_API_URL,
    VITE_BACKEND_DIRECT_URL: process.env.VITE_BACKEND_DIRECT_URL ?? fileEnv.VITE_BACKEND_DIRECT_URL,
  })
  return {
  define: { __BC_TARGET__: JSON.stringify(target) },
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}
})
