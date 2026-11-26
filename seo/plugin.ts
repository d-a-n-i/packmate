/*
 * Vite plugin: static SEO entry pages for GitHub Pages (static files only).
 *
 * - dev + build: fills the <!--seo:head--> / <!--seo:body--> placeholders in
 *   index.html with the English page.
 * - build: after Vite writes dist/index.html, writes dist/he/, dist/ru/ and
 *   dist/bg/index.html (same app bundle, translated head + static text) and
 *   dist/sitemap.xml, then checks every page so a broken template fails the
 *   build instead of deploying.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { PAGE_LANGS, PAGE_PATH, fillTemplate, pageUrl, relocalize, renderSitemap, type PageLang } from './pages'

function checkPage(html: string, l: PageLang) {
  const must = [
    `<html lang="${l}" dir="${l === 'he' ? 'rtl' : 'ltr'}">`,
    `<link rel="canonical" href="${pageUrl(l)}" />`,
    '<link rel="alternate" hreflang="x-default"',
    `id="pm-about" class="pm-about" lang="${l}"`,
    'application/ld+json',
    'data-goatcounter=',
    '<div id="root"></div>',
  ]
  for (const m of must) if (!html.includes(m)) throw new Error(`seo: ${PAGE_PATH[l]} is missing ${m}`)
  if (html.includes('<!--seo:')) throw new Error(`seo: ${PAGE_PATH[l]} still has an unfilled placeholder`)
}

export function seoPages(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'packmate-seo-pages',
    configResolved(c) {
      config = c
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => fillTemplate(html, 'en'),
    },
    writeBundle() {
      const outDir = resolve(config.root, config.build.outDir)
      const english = readFileSync(join(outDir, 'index.html'), 'utf8')
      checkPage(english, 'en')
      for (const l of PAGE_LANGS) {
        if (l === 'en') continue
        const html = relocalize(english, l)
        checkPage(html, l)
        mkdirSync(join(outDir, l), { recursive: true })
        writeFileSync(join(outDir, l, 'index.html'), html)
      }
      writeFileSync(join(outDir, 'sitemap.xml'), renderSitemap())
      config.logger.info(`seo: wrote ${PAGE_LANGS.map((l) => PAGE_PATH[l]).join(', ')} and sitemap.xml`)
    },
  }
}
