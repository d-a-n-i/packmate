import { describe, expect, it } from 'vitest'
import {
  COPY,
  PAGE_LANGS,
  SITE,
  fillTemplate,
  pageUrl,
  relocalize,
  renderBody,
  renderHead,
  renderSitemap,
  structuredData,
} from './pages'

const TEMPLATE = `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <!--seo:head-->
    <script>window.goatcounter={path:function(p){return location.host+p}}</script>
  </head>
  <body><div id="root"></div>
    <!--seo:body-->
  </body>
</html>`

describe('entry pages', () => {
  const built = fillTemplate(TEMPLATE, 'en')

  it.each(PAGE_LANGS)('%s: lang/dir, canonical, full hreflang set incl. x-default', (l) => {
    const html = l === 'en' ? built : relocalize(built, l)
    expect(html).toContain(`<html lang="${l}" dir="${l === 'he' ? 'rtl' : 'ltr'}">`)
    expect(html).toContain(`<link rel="canonical" href="${pageUrl(l)}" />`)
    for (const x of PAGE_LANGS) expect(html).toContain(`<link rel="alternate" hreflang="${x}" href="${pageUrl(x)}" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}/" />`)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html.match(/<title>/g)).toHaveLength(1)
    // Translated title, description, OG and Twitter tags.
    expect(html).toContain(`<title>${COPY[l].title}</title>`)
    expect(html).toContain(`<meta property="og:url" content="${pageUrl(l)}" />`)
    expect(html).toContain('og:description')
    expect(html).toContain('twitter:description')
    // Visible static text in the page language, and the counter snippet untouched.
    expect(html).toContain(`id="pm-about" class="pm-about" lang="${l}"`)
    expect(html).toContain('<script>window.goatcounter={path:function(p){return location.host+p}}</script>')
    expect(html).not.toContain('<!--seo:')
  })

  it('he, ru and bg pages carry no English page copy', () => {
    for (const l of ['he', 'ru', 'bg'] as const) {
      const html = relocalize(built, l)
      expect(html).not.toContain(COPY.en.title)
      expect(html).not.toContain(COPY.en.intro)
    }
  })

  it('relocalize fails loudly if the markers are gone', () => {
    expect(() => relocalize('<html><head></head></html>', 'he')).toThrow(/markers/)
  })
})

describe('structured data', () => {
  it.each(PAGE_LANGS)('%s: valid JSON-LD; FAQ answers are exactly the visible text', (l) => {
    const head = renderHead(l)
    const json = head.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1]
    const data = JSON.parse(json)
    expect(data).toEqual(structuredData(l))
    const [app, faq] = data['@graph']
    expect(app['@type']).toBe('WebApplication')
    expect(app.url).toBe(pageUrl(l))
    expect(faq['@type']).toBe('FAQPage')
    const body = renderBody(l)
    const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    const visible = unescape(body)
    for (const qa of faq.mainEntity) {
      expect(visible).toContain(qa.name)
      expect(visible).toContain(qa.acceptedAnswer.text)
    }
  })
})

describe('sitemap', () => {
  it('lists the four URLs with alternates', () => {
    const xml = renderSitemap()
    expect(xml.match(/<loc>/g)).toHaveLength(4)
    for (const l of PAGE_LANGS) expect(xml).toContain(`<loc>${pageUrl(l)}</loc>`)
    expect(xml).toContain('hreflang="x-default"')
  })
})

describe('copy rules', () => {
  it('no em dashes, no placement promises', () => {
    const all = JSON.stringify(COPY)
    expect(all).not.toContain('—')
    expect(all).not.toMatch(/guarantee|#1|best packing|rank/i)
  })

  it('every language has the same number of features and questions', () => {
    for (const l of PAGE_LANGS) {
      expect(COPY[l].features).toHaveLength(COPY.en.features.length)
      expect(COPY[l].faq).toHaveLength(COPY.en.faq.length)
    }
  })
})
