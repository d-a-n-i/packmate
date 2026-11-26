import { describe, expect, it } from 'vitest'
import { TRANSLATIONS } from './i18n'
import { SUPPORTED_LANGS } from './lang'
import { ITEMS, evaluateTrip, normalizeTrip, resolveItems, suggestedQty } from './packing'

const SKI_ADDITIONS = ['ski-pants', 'thermal-layers', 'ski-socks', 'neck-warmer', 'ski-helmet', 'ski-pass']

describe('translations', () => {
  it.each(SUPPORTED_LANGS)('%s names every catalog item', (l) => {
    const missing = ITEMS.filter((i) => !TRANSLATIONS[l].items[i.id]?.trim()).map((i) => i.id)
    expect(missing).toEqual([])
  })

  it('there are exactly four tables', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(['bg', 'en', 'he', 'ru'])
  })
})

describe('ski list', () => {
  it.each(SUPPORTED_LANGS)('%s: ski pants, thermals, ski socks, neck warmer, helmet and ski pass are listed and named', (l) => {
    for (const gender of ['male', 'female'] as const)
      for (const traveler of ['lean', 'it', 'prepared'] as const) {
        const ids = resolveItems(gender, traveler, 'ski').map((i) => i.id)
        for (const id of SKI_ADDITIONS) expect(ids).toContain(id)
      }
    for (const id of SKI_ADDITIONS) expect(TRANSLATIONS[l].items[id]).toBeTruthy()
  })

  it('ski items only appear on ski trips', () => {
    for (const tt of ['city', 'summer', 'hiking', 'business'] as const) {
      const ids = resolveItems('male', 'prepared', tt).map((i) => i.id)
      for (const id of SKI_ADDITIONS) expect(ids).not.toContain(id)
    }
  })

  it('ski pants, thermals and ski socks are essentials; helmet is optional (often rented)', () => {
    const items = resolveItems('male', 'lean', 'ski')
    const ess = (id: string) => items.find((i) => i.id === id)!.essential
    expect(ess('ski-pants') && ess('thermal-layers') && ess('ski-socks')).toBe(true)
    expect(ess('ski-helmet')).toBe(false)
  })

  it('thermal layers and ski socks scale with days and respect the laundry cap', () => {
    const trip = (days: number) => normalizeTrip({ days, travelType: 'ski', laundryDays: 7 })
    const { items } = evaluateTrip(trip(21))
    const socks = items.find((i) => i.id === 'ski-socks')!
    const thermals = items.find((i) => i.id === 'thermal-layers')!
    // 21 days with laundry every 7 -> planned for 8 days.
    expect(suggestedQty(socks, trip(21))).toBe(4)
    expect(suggestedQty(thermals, trip(21))).toBe(3)
    expect(suggestedQty(socks, trip(4))).toBe(2)
  })
})
