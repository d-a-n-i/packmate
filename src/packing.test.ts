import { describe, expect, it } from 'vitest'
import {
  BAG_LIMITS,
  CABIN_MAX_KG,
  ITEMS,
  TRAVEL_TYPES,
  TRAVELER_TYPES,
  bagQty,
  chooseLuggage,
  computeTotals,
  evaluateTrip,
  normalizeTrip,
  resolveItems,
  type Gender,
} from './packing'

describe('reference trips (pinned)', () => {
  // A: the default trip. Hand-checked: 11.00 kg of single items + 5.43 kg of
  // per-day clothing = 16.43 kg. At 41.7 L the old volume-only rule called
  // this a carry-on; with weight checked too it has to be a checked suitcase.
  it('A: default 7-day city trip, hold 20 kg', () => {
    const { totals, verdict } = evaluateTrip(normalizeTrip({}))
    expect(totals).toEqual({ weightKg: 16.43, volumeL: 41.71, count: 70, wornWeightKg: 0, wornCount: 0 })
    expect(verdict.nameKey).toBe('suitcase')
    expect(verdict.cabinBlockedBy).toBe('weight')
    expect(verdict.overLimit).toBe(false)
  })

  it('B: 3-day business trip, IT pro, cabin 10 kg, wearing blazer + dress shoes', () => {
    const { totals, verdict } = evaluateTrip(
      normalizeTrip({
        days: 3, gender: 'female', travelerType: 'it', travelType: 'business',
        limitKg: 10, worn: ['blazer', 'dress-shoes'],
      }),
    )
    expect(totals).toEqual({ weightKg: 12.77, volumeL: 30.96, count: 51, wornWeightKg: 1.4, wornCount: 2 })
    expect(verdict.nameKey).toBe('suitcase')
    expect(verdict.overLimit).toBe(true)
    expect(verdict.overByKg).toBeCloseTo(2.77, 3)
  })

  it('C: 2-day lean weekend, cabin 7 kg fits a backpack', () => {
    const { totals, verdict } = evaluateTrip(normalizeTrip({ days: 2, travelerType: 'lean', limitKg: 7 }))
    expect(totals).toEqual({ weightKg: 6.93, volumeL: 17.86, count: 36, wornWeightKg: 0, wornCount: 0 })
    expect(verdict.nameKey).toBe('backpack')
    expect(verdict.overLimit).toBe(false)
  })
})

describe('chooseLuggage: a bag tier must pass weight AND volume', () => {
  it('volume alone no longer decides', () => {
    expect(chooseLuggage(5, 20, 7).nameKey).toBe('backpack')
    expect(chooseLuggage(7.01, 20, 7).nameKey).toBe('suitcase')
    expect(chooseLuggage(8, 40, 8).nameKey).toBe('carryOn')
    expect(chooseLuggage(8.5, 40, 8)).toMatchObject({ nameKey: 'suitcase', overLimit: true, cabinBlockedBy: 'weight' })
  })

  it('too bulky for cabin even when light enough', () => {
    expect(chooseLuggage(6, 46, 10)).toMatchObject({ nameKey: 'suitcase', overLimit: false, cabinBlockedBy: 'volume' })
    expect(chooseLuggage(12, 46, 10)).toMatchObject({ cabinBlockedBy: 'both', overLimit: true })
  })

  it('with a hold limit, cabin tiers are still capped at the largest cabin allowance', () => {
    expect(chooseLuggage(CABIN_MAX_KG, 40, 20).nameKey).toBe('carryOn')
    expect(chooseLuggage(CABIN_MAX_KG + 0.01, 40, 20)).toMatchObject({ nameKey: 'suitcase', overLimit: false })
    expect(chooseLuggage(24, 60, 23)).toMatchObject({ overLimit: true, overByKg: 1 })
  })

  it('success criterion: no trip shows backpack/carry-on while over the chosen limit', () => {
    let checked = 0
    let cabinVerdicts = 0
    for (const gender of ['male', 'female'] as Gender[])
      for (const travelerType of TRAVELER_TYPES)
        for (const travelType of TRAVEL_TYPES)
          for (const limitKg of BAG_LIMITS)
            for (let days = 1; days <= 21; days++) {
              const { totals, verdict } = evaluateTrip(
                normalizeTrip({ days, gender, travelerType, travelType, limitKg }),
              )
              checked++
              if (verdict.tier < 3) {
                cabinVerdicts++
                expect(totals.weightKg).toBeLessThanOrEqual(limitKg)
                expect(totals.weightKg).toBeLessThanOrEqual(CABIN_MAX_KG)
              }
              expect(verdict.overLimit).toBe(totals.weightKg > limitKg)
            }
    expect(checked).toBe(2 * 3 * 5 * 5 * 21)
    expect(cabinVerdicts).toBeGreaterThan(0) // the sweep really exercises cabin verdicts
  })
})

describe('wearing it', () => {
  const items = resolveItems('male', 'prepared', 'city')
  const jacket = items.find((i) => i.id === 'jacket')!
  const tshirts = items.find((i) => i.id === 'tshirts')!
  const passport = items.find((i) => i.id === 'passport')!

  it('drops one unit from the bag totals and reports it separately', () => {
    const base = computeTotals(items, normalizeTrip({}))
    const worn = computeTotals(items, normalizeTrip({ worn: ['jacket', 'tshirts'] }))
    expect(worn.weightKg).toBeCloseTo(base.weightKg - jacket.weightKg - tshirts.weightKg, 3)
    expect(worn.volumeL).toBeCloseTo(base.volumeL - jacket.volumeL - tshirts.volumeL, 3)
    expect(worn.count).toBe(base.count - 2)
    expect(worn.wornWeightKg).toBeCloseTo(jacket.weightKg + tshirts.weightKg, 3)
    expect(worn.wornCount).toBe(2)
  })

  it('a worn single item has nothing left to pack', () => {
    const trip = normalizeTrip({ worn: ['jacket'] })
    expect(bagQty(jacket, trip)).toBe(0)
    expect(bagQty(tshirts, trip)).toBe(7)
  })

  it('cannot wear what is not on the list, or what is not wearable', () => {
    const trip = normalizeTrip({ worn: ['jacket', 'passport'], overrides: { jacket: 0 } })
    expect(bagQty(jacket, trip)).toBe(0)
    expect(computeTotals([jacket], trip).wornCount).toBe(0)
    expect(bagQty(passport, trip)).toBe(1)
  })
})

describe('normalizeTrip', () => {
  it('fills defaults for old saved state without the new fields', () => {
    const t = normalizeTrip({ days: 5, gender: 'female', travelerType: 'lean', travelType: 'ski', overrides: { socks: 3 } })
    expect(t).toMatchObject({ days: 5, limitKg: 20, worn: [], overrides: { socks: 3 } })
  })

  it('rejects junk', () => {
    const t = normalizeTrip({ days: 99, limitKg: 15, worn: [1, 'jacket', 'jacket'], overrides: { a: -1, b: 'x', c: 2 } })
    expect(t.days).toBe(21)
    expect(t.limitKg).toBe(20)
    expect(t.worn).toEqual(['jacket'])
    expect(t.overrides).toEqual({ c: 2 })
    expect(normalizeTrip(null).days).toBe(7)
  })
})

describe('catalog sanity', () => {
  it('item ids are unique', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
  })
})
