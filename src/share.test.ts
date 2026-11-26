import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeTrip } from './packing'
import {
  PACKED_KEY,
  RESTORE_KEY,
  STATE_KEY,
  bootFromSearch,
  clearRestorePoint,
  decodeTrip,
  encodeTrip,
  readRestorePoint,
  type KV,
} from './share'

class MemoryKV implements KV {
  map = new Map<string, string>()
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

const LANG_KEY = 'packmate.lang'
const mine = normalizeTrip({ days: 4, travelType: 'ski', gender: 'female', limitKg: 8, worn: ['jacket'], overrides: { socks: 6 } })
const theirs = normalizeTrip({ days: 10, travelType: 'summer', travelerType: 'lean', laundryDays: 5 })
const other = normalizeTrip({ days: 2, travelType: 'business' })
const search = (trip = theirs, lang?: 'en' | 'ru' | 'bg' | 'he') => `?t=${encodeTrip(trip, lang)}`

describe('share link encoding', () => {
  it('round-trips every trip field, including limit, worn and laundry', () => {
    const decoded = decodeTrip(encodeTrip(mine, 'he'))
    expect(decoded).toEqual({ state: mine, lang: 'he' })
  })

  it('reads old links that predate the new fields', () => {
    // A v2 link as the previous version wrote it (no k / w / n keys).
    const old = btoa(JSON.stringify({ v: 2, l: 'ru', d: 5, g: 'male', r: 'it', t: 'city', o: { tshirts: 3 } }))
    const decoded = decodeTrip(old)!
    expect(decoded.lang).toBe('ru')
    expect(decoded.state).toMatchObject({ days: 5, travelerType: 'it', limitKg: 20, worn: [], laundryDays: 7, overrides: { tshirts: 3 } })
  })

  it('rejects garbage', () => {
    expect(decodeTrip('%%%not-base64')).toBeNull()
    expect(decodeTrip(btoa('"just a string"'))).toBeNull()
  })
})

describe('opening a shared link does not hurt the recipient', () => {
  let kv: MemoryKV
  beforeEach(() => {
    kv = new MemoryKV()
  })

  it('snapshots the working trip, checks and saved language before the shared trip loads', () => {
    kv.setItem(STATE_KEY, JSON.stringify(mine))
    kv.setItem(PACKED_KEY, JSON.stringify({ passport: true, socks: true }))
    kv.setItem(LANG_KEY, 'bg')

    const boot = bootFromSearch(kv, search(theirs, 'ru'), 'bg', 1234)

    expect(boot.shared?.state).toEqual(theirs)
    expect(boot.resetPacked).toBe(true)
    expect(boot.restore).toEqual({ state: mine, packed: { passport: true, socks: true }, lang: 'bg', savedAt: 1234 })
    expect(readRestorePoint(kv)).toEqual(boot.restore) // survives a reload
    // The saved language is kept: the link's 'ru' is never written.
    expect(kv.getItem(LANG_KEY)).toBe('bg')
  })

  it('a second shared link keeps the original restore point', () => {
    kv.setItem(STATE_KEY, JSON.stringify(mine))
    bootFromSearch(kv, search(theirs), null, 1)
    // The app has now saved the first shared trip as the working trip.
    kv.setItem(STATE_KEY, JSON.stringify(theirs))
    const second = bootFromSearch(kv, search(other), null, 2)
    expect(second.restore?.state).toEqual(mine)
    expect(second.restore?.savedAt).toBe(1)
  })

  it('nothing to protect for a first-time visitor', () => {
    const boot = bootFromSearch(kv, search(), null, 1)
    expect(boot.shared?.state).toEqual(theirs)
    expect(boot.restore).toBeNull()
    expect(kv.getItem(RESTORE_KEY)).toBeNull()
  })

  it('opening your own link changes nothing and keeps your checks', () => {
    kv.setItem(STATE_KEY, JSON.stringify(mine))
    const boot = bootFromSearch(kv, search(mine), null, 1)
    expect(boot.restore).toBeNull()
    expect(boot.resetPacked).toBe(false)
  })

  it('no link: offers a pending restore point from an earlier visit', () => {
    kv.setItem(STATE_KEY, JSON.stringify(mine))
    bootFromSearch(kv, search(), null, 7)
    const later = bootFromSearch(kv, '', null, 8)
    expect(later.shared).toBeNull()
    expect(later.restore?.state).toEqual(mine)
    clearRestorePoint(kv)
    expect(bootFromSearch(kv, '', null, 9).restore).toBeNull()
  })

  it('a broken link leaves everything alone', () => {
    kv.setItem(STATE_KEY, JSON.stringify(mine))
    const boot = bootFromSearch(kv, '?t=@@@', null, 1)
    expect(boot.shared).toBeNull()
    expect(kv.getItem(RESTORE_KEY)).toBeNull()
    expect(JSON.parse(kv.getItem(STATE_KEY)!)).toEqual(mine)
  })
})
