import { describe, expect, it, vi } from 'vitest'
import {
  EVENT_NAMES,
  VISITS_KEY,
  localDay,
  noteVisit,
  returnVisitCheck,
  track,
  trackOncePerPage,
  type TrackWindow,
} from './analytics'

describe('track', () => {
  it('sends an event-style GoatCounter count', () => {
    const count = vi.fn()
    track('share', { goatcounter: { count } })
    expect(count).toHaveBeenCalledWith({ path: 'packmate.d85c.com/event/share', event: true })
  })

  it('never throws when the script is absent, broken or blocked', () => {
    expect(() => track('save', {})).not.toThrow()
    expect(() => track('save', { goatcounter: {} })).not.toThrow()
    expect(() => track('save', { goatcounter: { count: () => { throw new Error('blocked') } } })).not.toThrow()
    expect(() => track('save', undefined)).not.toThrow()
  })

  it('retries once on window load if count.js has not loaded yet', () => {
    let onLoad: (() => void) | undefined
    const win: TrackWindow = {
      document: { readyState: 'interactive' },
      addEventListener: (_t, fn) => { onLoad = fn },
    }
    track('shared_open', win)
    const count = vi.fn()
    win.goatcounter = { count }
    onLoad!()
    expect(count).toHaveBeenCalledWith({ path: 'packmate.d85c.com/event/shared_open', event: true })
  })

  it('trackOncePerPage only counts the first call', () => {
    const count = vi.fn()
    const win = { goatcounter: { count } }
    trackOncePerPage('first_check', win)
    trackOncePerPage('first_check', win)
    expect(count).toHaveBeenCalledTimes(1)
  })

  it('event names are fixed, lowercase identifiers (no personal data)', () => {
    expect(EVENT_NAMES).toEqual([
      'share', 'shared_open', 'save', 'load', 'first_check', 'five_checks',
      'print', 'language_change', 'return_visit',
    ])
    for (const n of EVENT_NAMES) expect(n).toMatch(/^[a-z_]+$/)
  })
})

describe('return_visit', () => {
  it('first visit only records the day', () => {
    expect(returnVisitCheck(null, '2026-11-26')).toEqual({ store: '{"first":"2026-11-26"}', fire: false })
  })

  it('same day does not count', () => {
    expect(returnVisitCheck('{"first":"2026-11-26"}', '2026-11-26')).toEqual({ store: null, fire: false })
  })

  it('a later day within 14 days fires once', () => {
    const r = returnVisitCheck('{"first":"2026-11-26"}', '2026-12-10')
    expect(r.fire).toBe(true)
    expect(returnVisitCheck(r.store, '2026-12-11')).toEqual({ store: null, fire: false })
  })

  it('after 14 days the window restarts', () => {
    expect(returnVisitCheck('{"first":"2026-11-26"}', '2026-12-11')).toEqual({ store: '{"first":"2026-12-11"}', fire: false })
  })

  it('corrupt storage just restarts', () => {
    expect(returnVisitCheck('nope', '2026-11-26').fire).toBe(false)
    expect(returnVisitCheck('{"first":"yesterday"}', '2026-11-26').store).toBe('{"first":"2026-11-26"}')
  })

  it('noteVisit wires storage and the counter together', () => {
    const map = new Map<string, string>()
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
    const count = vi.fn()
    const win = { goatcounter: { count } }
    noteVisit(storage, new Date(2026, 10, 26, 9), win)
    noteVisit(storage, new Date(2026, 10, 26, 22), win)
    expect(count).not.toHaveBeenCalled()
    noteVisit(storage, new Date(2026, 10, 28, 8), win)
    expect(count).toHaveBeenCalledWith({ path: 'packmate.d85c.com/event/return_visit', event: true })
    expect(JSON.parse(map.get(VISITS_KEY)!)).toEqual({ first: '2026-11-26', done: true })
    expect(() => noteVisit(undefined, new Date(), win)).not.toThrow()
  })

  it('localDay uses the local calendar', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
