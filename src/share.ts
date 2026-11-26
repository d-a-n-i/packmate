/*
 * Share links and the "don't hurt the recipient" boot logic.
 *
 * Opening someone's shared trip replaces the working trip, so before it loads
 * we keep a restore point of the visitor's own trip, packing checks and saved
 * language, and offer a one-tap restore. Pure apart from the KV store passed
 * in (localStorage in the app, a Map in tests).
 */
import { normalizeTrip, type TripState } from './packing'
import { isLang, type Lang } from './lang'

export interface KV {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const STATE_KEY = 'packmate.state.v2'
export const PACKED_KEY = 'packmate.packed.v1'
export const RESTORE_KEY = 'packmate.beforeShare.v1'

/* ------------------------------------------------------------------ encoding */

// Compact, URL-safe base64 of a trip so it can travel in a query string and
// reproduce the exact setup on any device. Keys kept short.
export function encodeTrip(state: TripState, lang?: Lang): string {
  const payload = {
    v: 2, l: lang,
    d: state.days, g: state.gender,
    r: state.travelerType, t: state.travelType,
    o: state.overrides,
    k: state.limitKg,
    w: state.worn,
    n: state.laundryDays,
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface SharedTrip {
  state: TripState
  /** The sender's language, if the link carries one. */
  lang?: Lang
}

export function decodeTrip(param: string): SharedTrip | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const p = JSON.parse(new TextDecoder().decode(bytes))
    if (!p || typeof p !== 'object') return null
    return {
      state: normalizeTrip({
        days: p.d, gender: p.g, travelerType: p.r, travelType: p.t,
        overrides: p.o, limitKg: p.k, worn: p.w, laundryDays: p.n,
      }),
      lang: isLang(p.l) ? p.l : undefined,
    }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ restore point */

export interface RestorePoint {
  state: TripState
  packed: Record<string, boolean>
  /** The visitor's saved (explicitly chosen) language at the time, if any. */
  lang: Lang | null
  savedAt: number
}

function readJson(store: KV, key: string): unknown {
  try {
    const raw = store.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalizePacked(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (x === true) out[k] = true
  return out
}

export function sameTrip(a: TripState, b: TripState): boolean {
  return JSON.stringify(normalizeTrip(a)) === JSON.stringify(normalizeTrip(b))
}

export function readRestorePoint(store: KV): RestorePoint | null {
  const p = readJson(store, RESTORE_KEY) as Partial<RestorePoint> | null
  if (!p || typeof p !== 'object' || !p.state) return null
  return {
    state: normalizeTrip(p.state),
    packed: normalizePacked(p.packed),
    lang: isLang(p.lang) ? p.lang : null,
    savedAt: Number(p.savedAt) || 0,
  }
}

export function clearRestorePoint(store: KV) {
  try { store.removeItem(RESTORE_KEY) } catch { /* ignore */ }
}

/**
 * Call BEFORE a shared trip replaces the working trip. Saves the visitor's
 * current trip, checks and saved language unless there is nothing to protect
 * (no working trip yet, or the link is the same trip). An existing restore
 * point is never overwritten: opening two shared links in a row must still
 * restore the visitor's own trip, not the first link.
 */
export function protectBeforeShared(
  store: KV,
  shared: TripState,
  savedLang: Lang | null,
  now: number,
): { restore: RestorePoint | null; replacesTrip: boolean } {
  const existing = readRestorePoint(store)
  const rawState = readJson(store, STATE_KEY)
  const current = rawState ? normalizeTrip(rawState) : null
  const replacesTrip = !current || !sameTrip(current, shared)
  if (existing) return { restore: existing, replacesTrip }
  if (!current || !replacesTrip) return { restore: null, replacesTrip }
  const point: RestorePoint = {
    state: current,
    packed: normalizePacked(readJson(store, PACKED_KEY)),
    lang: savedLang,
    savedAt: now,
  }
  try { store.setItem(RESTORE_KEY, JSON.stringify(point)) } catch { /* storage full or off */ }
  return { restore: point, replacesTrip }
}

/**
 * Everything the app needs at startup from a `?t=` link. Does not touch the
 * URL (the caller strips the param) and never writes the language.
 */
export function bootFromSearch(
  store: KV,
  search: string,
  savedLang: Lang | null,
  now: number,
): { shared: SharedTrip | null; restore: RestorePoint | null; resetPacked: boolean } {
  let shared: SharedTrip | null = null
  try {
    const raw = new URLSearchParams(search).get('t')
    shared = raw ? decodeTrip(raw) : null
  } catch { /* malformed query */ }
  if (!shared) return { shared: null, restore: readRestorePoint(store), resetPacked: false }
  const { restore, replacesTrip } = protectBeforeShared(store, shared.state, savedLang, now)
  // Someone else's list starts unchecked; the visitor's own checks are in the restore point.
  return { shared, restore, resetPacked: replacesTrip }
}
