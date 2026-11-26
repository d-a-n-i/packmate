/*
 * Supported UI languages and how the starting language is chosen.
 *
 * Rules, in order:
 *  1. A saved explicit choice (made with the language switch) always wins.
 *  2. A language entry page (/he/, /ru/, /bg/) the visitor opened.
 *  3. navigator.languages walked IN ORDER: the first tag whose base language
 *     is supported wins. Unsupported tags are skipped (never mapped to a
 *     "nearby" language), and a later tag never overrides an earlier one.
 *  4. Otherwise English, with a visible "Language: English - change" note.
 *
 * No country, region subtag, timezone, IP or other location/identity signal
 * is used. Only the base language of each browser tag counts.
 */

export type Lang = 'en' | 'ru' | 'bg' | 'he'

export const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'bg', 'he']

export const isLang = (v: unknown): v is Lang =>
  typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v)

/** Written only when the visitor picks a language with the switch. */
export const LANG_CHOICE_KEY = 'packmate.lang.choice.v1'
/**
 * The previous version wrote this key on every visit (including guesses from
 * timezone), so its value is not evidence of a choice. It is ignored and removed.
 */
export const LEGACY_LANG_KEY = 'packmate.lang'

/** URL path prefix of each language's entry page. English lives at the root. */
export const LANG_PATH: Record<Lang, string> = { en: '/', he: '/he/', ru: '/ru/', bg: '/bg/' }

/** Base language of a BCP 47 tag: 'he-IL' -> 'he', 'ru_RU' -> 'ru'. 'iw' is the old code for Hebrew. */
export function baseLanguage(tag: string): string {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0]
  return base === 'iw' ? 'he' : base
}

/** Language of an entry page path ('/he/', '/ru/index.html'), or null for the root and anything else. */
export function langFromPath(pathname: string): Lang | null {
  const first = pathname.split('/').filter(Boolean)[0]
  return first && first !== 'en' && isLang(first) ? first : null
}

export type LangSource = 'saved' | 'path' | 'browser' | 'fallback'

export function detectLanguage(input: {
  saved?: string | null
  pathLang?: Lang | null
  languages?: readonly string[]
}): { lang: Lang; source: LangSource } {
  if (isLang(input.saved)) return { lang: input.saved, source: 'saved' }
  if (input.pathLang) return { lang: input.pathLang, source: 'path' }
  for (const tag of input.languages ?? []) {
    if (typeof tag !== 'string') continue
    const base = baseLanguage(tag)
    if (isLang(base)) return { lang: base, source: 'browser' }
  }
  return { lang: 'en', source: 'fallback' }
}

/** The browser's preference list, falling back to navigator.language. */
export function browserLanguages(nav: { languages?: readonly string[]; language?: string } | undefined): string[] {
  if (!nav) return []
  if (nav.languages && nav.languages.length > 0) return [...nav.languages]
  return nav.language ? [nav.language] : []
}
