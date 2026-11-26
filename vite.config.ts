import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { seoPages } from './seo/plugin'

// https://vite.dev/config/
export default defineConfig({
  // Served from the root of a dedicated subdomain (packmate.d85c.com),
  // so assets resolve against '/' rather than a sub-path.
  base: '/',
  // seoPages() writes the static /he/, /ru/, /bg/ entry pages and sitemap.xml.
  plugins: [react(), seoPages()],
})
