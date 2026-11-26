/*
 * Cookie-free event counts through GoatCounter (loaded from index.html).
 *
 * Every call is guarded: if count.js is missing, blocked or still loading,
 * nothing throws and nothing breaks. Event names are fixed strings: no trip
 * contents, ids or other personal data ever go into them.
 */

export const EVENT_NAMES = [
  'share',
  'shared_open',
  'save',
  'load',
  'first_check',
  'five_checks',
  'print',
  'language_change',
  'return_visit',
] as const
export type EventName = (typeof EVENT_NAMES)[number]

interface GoatCounterLike {
  count?: (vars: { path: string; event: boolean }) => void
}

export interface TrackWindow {
  goatcounter?: GoatCounterLike
  document?: { readyState?: string }
  addEventListener?: (type: string, fn: () => void, opts?: { once?: boolean }) => void
}

const browserWindow = (): TrackWindow | undefined =>
  typeof window !== 'undefined' ? (window as unknown as TrackWindow) : undefined

/** Count one event. Never throws. */
export function track(name: EventName, win: TrackWindow | undefined = browserWindow()): void {
  if (!win) return
  const send = (): boolean => {
    const gc = win.goatcounter
    if (!gc || typeof gc.count !== 'function') return false
    gc.count({ path: `event/${name}`, event: true })
    return true
  }
  try {
    if (send()) return
    // count.js is async: an event fired during startup can beat it. Async
    // scripts finish before the window "load" event, so retry once then.
    if (win.document?.readyState !== 'complete' && typeof win.addEventListener === 'function')
      win.addEventListener('load', () => { try { send() } catch { /* ignore */ } }, { once: true })
  } catch {
    /* blocked, missing or broken counter: ignore */
  }
}

const firedThisPage = new Set<EventName>()

/** Count an event at most once per page load. */
export function trackOncePerPage(name: EventName, win?: TrackWindow): void {
  if (firedThisPage.has(name)) return
  firedThisPage.add(name)
  track(name, win ?? browserWindow())
}

/* ------------------------------------------------------------------ return visits */

/**
 * "return_visit": a visit on a later calendar day within 14 days of the first
 * visit. Stored in localStorage only (no cookies), fires at most once per
 * browser. If nobody returns within 14 days, the window restarts.
 */
export const VISITS_KEY = 'packmate.visits.v1'
export const RETURN_WINDOW_DAYS = 14

/** Local calendar day as YYYY-MM-DD. */
export function localDay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000

export function returnVisitCheck(
  stored: string | null,
  today: string,
): { store: string | null; fire: boolean } {
  let rec: { first?: unknown; done?: unknown } | null
  try { rec = stored ? JSON.parse(stored) : null } catch { rec = null }
  const fresh = { store: JSON.stringify({ first: today }), fire: false }
  if (!rec || typeof rec.first !== 'string' || !DAY_RE.test(rec.first)) return fresh
  if (rec.done === true) return { store: null, fire: false }
  const diff = dayNumber(today) - dayNumber(rec.first)
  if (diff === 0) return { store: null, fire: false }
  if (diff > 0 && diff <= RETURN_WINDOW_DAYS)
    return { store: JSON.stringify({ first: rec.first, done: true }), fire: true }
  return fresh // too late (or the clock went backwards): start a new window
}

/** Run the return-visit check against real storage. Never throws. */
export function noteVisit(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined, now: Date, win?: TrackWindow) {
  try {
    if (!storage) return
    const { store, fire } = returnVisitCheck(storage.getItem(VISITS_KEY), localDay(now))
    if (store !== null) storage.setItem(VISITS_KEY, store)
    if (fire) track('return_visit', win ?? browserWindow())
  } catch {
    /* storage disabled */
  }
}
