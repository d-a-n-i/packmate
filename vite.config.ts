import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from the root of a dedicated subdomain (packmate.d85c.com),
  // so assets resolve against '/' rather than a sub-path.
  base: '/',
  plugins: [react()],
})
