/* Supported UI languages. */

export type Lang = 'en' | 'ru' | 'bg' | 'he'

export const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'bg', 'he']

export const isLang = (v: unknown): v is Lang =>
  typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v)
