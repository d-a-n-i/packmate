import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { baseLanguage, browserLanguages, detectLanguage, langFromPath } from './lang'

const browser = (...languages: string[]) => detectLanguage({ languages })

describe('rule a: a saved explicit choice always wins', () => {
  it('saved choice beats detection', () => {
    expect(detectLanguage({ saved: 'bg', languages: ['he-IL', 'en'] })).toEqual({ lang: 'bg', source: 'saved' })
  })
  it('saved choice beats an entry-page path', () => {
    expect(detectLanguage({ saved: 'en', pathLang: 'ru', languages: ['ru'] })).toEqual({ lang: 'en', source: 'saved' })
  })
  it('an invalid saved value is ignored', () => {
    expect(detectLanguage({ saved: 'fr', languages: ['ru'] })).toEqual({ lang: 'ru', source: 'browser' })
    expect(detectLanguage({ saved: null, languages: ['ru'] }).lang).toBe('ru')
  })
})

describe('rule b: navigator.languages in order, first supported base language', () => {
  it('["en","ru"] -> en (an earlier supported English beats a later Russian)', () => {
    expect(browser('en', 'ru')).toEqual({ lang: 'en', source: 'browser' })
    expect(browser('en-US', 'ru-RU').lang).toBe('en')
  })
  it('["uk","ru"] -> ru (unsupported Ukrainian is skipped, not mapped)', () => {
    expect(browser('uk', 'ru')).toEqual({ lang: 'ru', source: 'browser' })
  })
  it('["he-IL","en"] -> he', () => {
    expect(browser('he-IL', 'en')).toEqual({ lang: 'he', source: 'browser' })
  })
  it('a later tag never overrides an earlier supported one', () => {
    expect(browser('ru-RU', 'en', 'he').lang).toBe('ru')
    expect(browser('bg', 'ru').lang).toBe('bg')
    expect(browser('zh-CN', 'de', 'bg-BG', 'he').lang).toBe('bg')
  })
  it('only the base language counts: region subtags are ignored', () => {
    // A region is not a language: en-IL is English, ru-UA is Russian.
    expect(browser('en-IL').lang).toBe('en')
    expect(browser('en-BG', 'bg').lang).toBe('en')
    expect(browser('ru_UA').lang).toBe('ru')
  })
  it('legacy "iw" is Hebrew', () => {
    expect(baseLanguage('iw-IL')).toBe('he')
    expect(browser('iw').lang).toBe('he')
  })
})

describe('rule c: nothing supported -> English with a visible note', () => {
  it('["lt"] -> en with the fallback note', () => {
    expect(browser('lt')).toEqual({ lang: 'en', source: 'fallback' })
  })
  it('unsupported tags are skipped, never mapped to Russian or Bulgarian', () => {
    for (const tag of ['uk', 'ka', 'lt', 'et', 'lv', 'kk', 'be', 'uz', 'hy', 'az', 'mk', 'sr'])
      expect(browser(tag)).toEqual({ lang: 'en', source: 'fallback' })
    expect(browser('uk-UA', 'kk', 'lv').source).toBe('fallback')
  })
  it('empty or missing list -> fallback', () => {
    expect(browser()).toEqual({ lang: 'en', source: 'fallback' })
    expect(detectLanguage({})).toEqual({ lang: 'en', source: 'fallback' })
  })
})

describe('entry pages', () => {
  it('an entry-page path picks the language when nothing is saved', () => {
    expect(detectLanguage({ pathLang: 'he', languages: ['en'] })).toEqual({ lang: 'he', source: 'path' })
  })
  it('langFromPath reads only /he/, /ru/, /bg/', () => {
    expect(langFromPath('/he/')).toBe('he')
    expect(langFromPath('/ru')).toBe('ru')
    expect(langFromPath('/bg/index.html')).toBe('bg')
    expect(langFromPath('/')).toBeNull()
    expect(langFromPath('/en/')).toBeNull()
    expect(langFromPath('/hello/')).toBeNull()
  })
})

describe('browserLanguages', () => {
  it('prefers navigator.languages, falls back to navigator.language', () => {
    expect(browserLanguages({ languages: ['lt', 'ru'], language: 'lt' })).toEqual(['lt', 'ru'])
    expect(browserLanguages({ languages: [], language: 'bg-BG' })).toEqual(['bg-BG'])
    expect(browserLanguages(undefined)).toEqual([])
  })
})

describe('rule d: no location or identity signals', () => {
  it('the app never reads timezone, country lists or IP for language', () => {
    for (const f of ['./lang.ts', './App.tsx']) {
      const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')
      expect(src).not.toMatch(/timeZone|resolvedOptions|RUSSIAN_COUNTRIES|_TIMEZONES/)
    }
  })
})
