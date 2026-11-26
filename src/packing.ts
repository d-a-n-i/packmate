/*
 * Pure packing logic: the item catalog, profile rules, quantity suggestions,
 * bag totals and the luggage verdict. No React, no DOM, no storage - so it can
 * be unit-tested directly (see packing.test.ts).
 */

export type Gender = 'male' | 'female'
export type TravelerType = 'lean' | 'it' | 'prepared'
export type TravelType = 'city' | 'summer' | 'ski' | 'hiking' | 'business'

export type Category =
  | 'documents'
  | 'electronics'
  | 'clothing'
  | 'outerwear'
  | 'footwear'
  | 'toiletries'
  | 'health'
  | 'extras'
  | 'specialty'

export interface PackItem {
  id: string
  emoji: string
  category: Category
  /** Per-day multiplier for scaling items. 0 for fixed items. */
  basePerDay: number
  weightKg: number
  volumeL: number
  /** Fixed items always default to a quantity of 1. */
  fixed: boolean
  gender?: Gender
  /** Baseline essential flag (additional essentials come from traveler / travel type). */
  essential?: boolean
  /** Show only on these travel types. */
  onlyTravelTypes?: TravelType[]
  /** Can be worn on the travel day instead of packed. */
  wearable?: boolean
}

export interface ResolvedItem extends PackItem {
  /** Final essential flag after traveler / travel type rules applied. */
  essential: boolean
}

/* ------------------------------------------------------------------ bag limits */

/** Weight allowances offered in the picker: cabin 7 / 8 / 10 kg, hold 20 / 23 kg. */
export const BAG_LIMITS = [7, 8, 10, 20, 23] as const
export type BagLimit = (typeof BAG_LIMITS)[number]
export const DEFAULT_LIMIT: BagLimit = 20

/** Volume caps for the two cabin-sized tiers. */
export const BACKPACK_MAX_L = 25
export const CARRY_ON_MAX_L = 45
/**
 * A backpack or carry-on is a cabin bag, so it can never be heavier than the
 * largest cabin allowance the picker offers - even when a hold limit is chosen.
 */
export const CABIN_MAX_KG = 10

export const isCabinLimit = (l: BagLimit) => l <= CABIN_MAX_KG
export const isBagLimit = (v: unknown): v is BagLimit =>
  typeof v === 'number' && (BAG_LIMITS as readonly number[]).includes(v)

/* ------------------------------------------------------------------ laundry + profile factors */

export const LAUNDRY_OPTIONS = [3, 4, 5, 7, 10, 14] as const
export type LaundryDays = (typeof LAUNDRY_OPTIONS)[number]
export const DEFAULT_LAUNDRY: LaundryDays = 7
export const isLaundryDays = (v: unknown): v is LaundryDays =>
  typeof v === 'number' && (LAUNDRY_OPTIONS as readonly number[]).includes(v)

/** Lean travelers re-wear more: per-day multipliers are scaled down. */
export const PER_DAY_FACTOR: Record<TravelerType, number> = { lean: 0.7, it: 1, prepared: 1 }

/* ------------------------------------------------------------------ trip state */

export interface TripState {
  days: number
  gender: Gender
  travelerType: TravelerType
  travelType: TravelType
  overrides: Record<string, number>
  /** Chosen weight allowance (kg). */
  limitKg: BagLimit
  /** Item ids worn on the travel day: one unit of each leaves the bag totals. */
  worn: string[]
  /** You can do laundry every N days: per-day clothing is capped at N + 1. */
  laundryDays: LaundryDays
}

export const DEFAULT_TRIP: TripState = {
  days: 7,
  gender: 'male',
  travelerType: 'prepared',
  travelType: 'city',
  overrides: {},
  limitKg: DEFAULT_LIMIT,
  worn: [],
  laundryDays: DEFAULT_LAUNDRY,
}

export const TRAVELER_TYPES: TravelerType[] = ['lean', 'it', 'prepared']
export const TRAVEL_TYPES: TravelType[] = ['city', 'summer', 'ski', 'hiking', 'business']
export const MIN_DAYS = 1
export const MAX_DAYS = 21

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Coerce anything (stored JSON, a decoded share link, an old snapshot) into a valid trip. */
export function normalizeTrip(raw: unknown): TripState {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const overrides: Record<string, number> = {}
  if (p.overrides && typeof p.overrides === 'object') {
    for (const [k, v] of Object.entries(p.overrides as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) overrides[k] = Math.floor(v)
    }
  }
  const worn = Array.isArray(p.worn)
    ? [...new Set(p.worn.filter((x): x is string => typeof x === 'string'))].sort()
    : []
  return {
    days: clamp(Math.round(Number(p.days)) || DEFAULT_TRIP.days, MIN_DAYS, MAX_DAYS),
    gender: p.gender === 'female' ? 'female' : 'male',
    travelerType: TRAVELER_TYPES.includes(p.travelerType as TravelerType)
      ? (p.travelerType as TravelerType)
      : DEFAULT_TRIP.travelerType,
    travelType: TRAVEL_TYPES.includes(p.travelType as TravelType)
      ? (p.travelType as TravelType)
      : DEFAULT_TRIP.travelType,
    overrides,
    limitKg: isBagLimit(p.limitKg) ? p.limitKg : DEFAULT_LIMIT,
    worn,
    laundryDays: isLaundryDays(p.laundryDays) ? p.laundryDays : DEFAULT_LAUNDRY,
  }
}

/* ------------------------------------------------------------------ catalog */

export const CATEGORY_ORDER: Category[] = [
  'documents',
  'electronics',
  'clothing',
  'outerwear',
  'footwear',
  'toiletries',
  'health',
  'extras',
  'specialty',
]

export const ITEMS: PackItem[] = [
  // Documents & Money
  { id: 'passport',     emoji: '📔', category: 'documents', basePerDay: 0, weightKg: 0.05, volumeL: 0.10, fixed: true, essential: true },
  { id: 'wallet',       emoji: '👛', category: 'documents', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true, essential: true },
  { id: 'id-card',      emoji: '🪪', category: 'documents', basePerDay: 0, weightKg: 0.01, volumeL: 0.02, fixed: true, essential: true },
  { id: 'cash-cards',   emoji: '💳', category: 'documents', basePerDay: 0, weightKg: 0.03, volumeL: 0.05, fixed: true, essential: true },
  { id: 'insurance',    emoji: '📄', category: 'documents', basePerDay: 0, weightKg: 0.02, volumeL: 0.05, fixed: true },

  // Electronics
  { id: 'phone',          emoji: '📱', category: 'electronics', basePerDay: 0, weightKg: 0.20, volumeL: 0.15, fixed: true, essential: true },
  { id: 'charger',        emoji: '🔌', category: 'electronics', basePerDay: 0, weightKg: 0.12, volumeL: 0.30, fixed: true, essential: true },
  { id: 'power-adapter',  emoji: '🔌', category: 'electronics', basePerDay: 0, weightKg: 0.15, volumeL: 0.25, fixed: true },
  { id: 'power-bank',     emoji: '🔋', category: 'electronics', basePerDay: 0, weightKg: 0.35, volumeL: 0.40, fixed: true },
  { id: 'headphones',     emoji: '🎧', category: 'electronics', basePerDay: 0, weightKg: 0.25, volumeL: 0.60, fixed: true },
  { id: 'laptop',         emoji: '💻', category: 'electronics', basePerDay: 0, weightKg: 1.50, volumeL: 2.00, fixed: true },
  { id: 'laptop-charger', emoji: '⚡', category: 'electronics', basePerDay: 0, weightKg: 0.40, volumeL: 0.50, fixed: true },
  { id: 'camera',         emoji: '📷', category: 'electronics', basePerDay: 0, weightKg: 0.60, volumeL: 1.00, fixed: true },

  // Clothing (mostly scaling)
  { id: 'tshirts',     emoji: '👕', category: 'clothing', basePerDay: 1,    weightKg: 0.18, volumeL: 0.60, fixed: false, essential: true, wearable: true },
  { id: 'underwear',   emoji: '🩲', category: 'clothing', basePerDay: 1,    weightKg: 0.05, volumeL: 0.15, fixed: false, essential: true, wearable: true },
  { id: 'socks',       emoji: '🧦', category: 'clothing', basePerDay: 1,    weightKg: 0.06, volumeL: 0.20, fixed: false, essential: true, wearable: true },
  { id: 'pants',       emoji: '👖', category: 'clothing', basePerDay: 0.34, weightKg: 0.55, volumeL: 1.20, fixed: false, wearable: true },
  { id: 'shorts',      emoji: '🩳', category: 'clothing', basePerDay: 0.30, weightKg: 0.25, volumeL: 0.60, fixed: false, wearable: true },
  { id: 'dress-shirt', emoji: '👔', category: 'clothing', basePerDay: 0.50, weightKg: 0.25, volumeL: 0.80, fixed: false, onlyTravelTypes: ['city', 'business'], wearable: true },
  { id: 'pajamas',     emoji: '🛌', category: 'clothing', basePerDay: 0,    weightKg: 0.30, volumeL: 0.70, fixed: true },
  { id: 'swimwear',    emoji: '🩳', category: 'clothing', basePerDay: 0,    weightKg: 0.15, volumeL: 0.30, fixed: true },

  // Outerwear
  { id: 'sweater',     emoji: '🧶', category: 'outerwear', basePerDay: 0, weightKg: 0.50, volumeL: 1.80, fixed: true, wearable: true },
  { id: 'jacket',      emoji: '🧥', category: 'outerwear', basePerDay: 0, weightKg: 0.90, volumeL: 3.50, fixed: true, wearable: true },
  { id: 'rain-jacket', emoji: '☔', category: 'outerwear', basePerDay: 0, weightKg: 0.30, volumeL: 0.80, fixed: true, wearable: true },
  { id: 'blazer',      emoji: '🧥', category: 'outerwear', basePerDay: 0, weightKg: 0.70, volumeL: 3.00, fixed: true, onlyTravelTypes: ['business'], wearable: true },

  // Footwear
  { id: 'sneakers',    emoji: '👟', category: 'footwear', basePerDay: 0, weightKg: 0.80, volumeL: 2.50, fixed: true, essential: true, wearable: true },
  { id: 'sandals',     emoji: '🩴', category: 'footwear', basePerDay: 0, weightKg: 0.30, volumeL: 1.00, fixed: true, wearable: true },
  { id: 'dress-shoes', emoji: '👞', category: 'footwear', basePerDay: 0, weightKg: 0.70, volumeL: 2.00, fixed: true, wearable: true },

  // Toiletries
  { id: 'toothbrush', emoji: '🪥', category: 'toiletries', basePerDay: 0, weightKg: 0.02, volumeL: 0.05, fixed: true, essential: true },
  { id: 'toothpaste', emoji: '🧴', category: 'toiletries', basePerDay: 0, weightKg: 0.10, volumeL: 0.15, fixed: true },
  { id: 'soap',       emoji: '🧼', category: 'toiletries', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true },
  { id: 'shampoo',    emoji: '🧴', category: 'toiletries', basePerDay: 0, weightKg: 0.20, volumeL: 0.25, fixed: true },
  { id: 'deodorant',  emoji: '🌬️', category: 'toiletries', basePerDay: 0, weightKg: 0.10, volumeL: 0.15, fixed: true },
  { id: 'sunscreen',  emoji: '🧴', category: 'toiletries', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true },
  { id: 'chapstick',  emoji: '💋', category: 'toiletries', basePerDay: 0, weightKg: 0.02, volumeL: 0.04, fixed: true },
  { id: 'hand-sanitizer', emoji: '🫧', category: 'toiletries', basePerDay: 0, weightKg: 0.08, volumeL: 0.10, fixed: true },
  { id: 'period-care',    emoji: '🌸', category: 'toiletries', basePerDay: 0, weightKg: 0.15, volumeL: 0.25, fixed: true, gender: 'female' },
  { id: 'shaving',    emoji: '🪒', category: 'toiletries', basePerDay: 0, weightKg: 0.35, volumeL: 0.80, fixed: true, gender: 'male' },
  { id: 'makeup',     emoji: '💄', category: 'toiletries', basePerDay: 0, weightKg: 0.55, volumeL: 1.20, fixed: true, gender: 'female' },

  // Health & Comfort
  { id: 'medications',   emoji: '💊', category: 'health', basePerDay: 0, weightKg: 0.15, volumeL: 0.30, fixed: true, essential: true },
  { id: 'first-aid',     emoji: '⛑️', category: 'health', basePerDay: 0, weightKg: 0.25, volumeL: 0.50, fixed: true },
  { id: 'insect-repellent', emoji: '🦟', category: 'health', basePerDay: 0, weightKg: 0.10, volumeL: 0.15, fixed: true, essential: true, onlyTravelTypes: ['summer', 'hiking'] },
  { id: 'travel-pillow', emoji: '💺', category: 'health', basePerDay: 0, weightKg: 0.30, volumeL: 2.00, fixed: true },
  { id: 'sleep-mask',    emoji: '😴', category: 'health', basePerDay: 0, weightKg: 0.05, volumeL: 0.10, fixed: true },

  // Travel Extras
  { id: 'water-bottle', emoji: '💧', category: 'extras', basePerDay: 0, weightKg: 0.15, volumeL: 0.70, fixed: true },
  { id: 'book',         emoji: '📖', category: 'extras', basePerDay: 0, weightKg: 0.30, volumeL: 0.50, fixed: true },
  { id: 'sunglasses',   emoji: '🕶️', category: 'extras', basePerDay: 0, weightKg: 0.05, volumeL: 0.20, fixed: true, wearable: true },
  { id: 'day-backpack', emoji: '🎒', category: 'extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },
  { id: 'umbrella',     emoji: '☂️', category: 'extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },

  // Specialty Gear (gated by travel type)
  { id: 'ski-gloves',    emoji: '🧤', category: 'specialty', basePerDay: 0, weightKg: 0.20, volumeL: 0.60, fixed: true, onlyTravelTypes: ['ski'], wearable: true },
  { id: 'ski-goggles',   emoji: '🥽', category: 'specialty', basePerDay: 0, weightKg: 0.15, volumeL: 0.40, fixed: true, onlyTravelTypes: ['ski'] },
  { id: 'beanie',        emoji: '🎿', category: 'specialty', basePerDay: 0, weightKg: 0.10, volumeL: 0.30, fixed: true, onlyTravelTypes: ['ski'], wearable: true },
  { id: 'hiking-boots',  emoji: '🥾', category: 'specialty', basePerDay: 0, weightKg: 1.10, volumeL: 3.00, fixed: true, onlyTravelTypes: ['hiking'], wearable: true },
  { id: 'beach-towel',   emoji: '🏖️', category: 'specialty', basePerDay: 0, weightKg: 0.40, volumeL: 1.40, fixed: true, onlyTravelTypes: ['summer'] },
  { id: 'necktie',       emoji: '👔', category: 'specialty', basePerDay: 0, weightKg: 0.10, volumeL: 0.30, fixed: true, onlyTravelTypes: ['business'], wearable: true },
]

/* ------------------------------------------------------------------ profile rules */

const TRAVEL_HIDE: Record<TravelType, string[]> = {
  city:     [],
  summer:   ['jacket', 'sweater', 'rain-jacket'],
  ski:      ['swimwear', 'sandals', 'dress-shoes', 'shorts'],
  hiking:   ['dress-shoes', 'swimwear', 'sandals'],
  business: ['swimwear', 'sandals', 'shorts'],
}

const TRAVEL_ESSENTIALS: Record<TravelType, string[]> = {
  city:     [],
  summer:   ['sunscreen', 'sunglasses', 'sandals', 'swimwear', 'beach-towel', 'shorts'],
  ski:      ['jacket', 'sweater', 'ski-gloves', 'ski-goggles', 'beanie'],
  hiking:   ['water-bottle', 'day-backpack', 'hiking-boots', 'sunscreen'],
  business: ['dress-shoes', 'dress-shirt', 'blazer', 'pants', 'laptop'],
}

const TRAVELER_HIDE: Record<TravelerType, string[]> = {
  lean:     ['laptop', 'laptop-charger', 'camera', 'travel-pillow', 'day-backpack', 'umbrella', 'dress-shoes', 'sweater', 'pajamas', 'sleep-mask', 'first-aid', 'book'],
  it:       [],
  prepared: [],
}

const TRAVELER_ESSENTIALS: Record<TravelerType, string[]> = {
  lean:     [],
  it:       ['laptop', 'laptop-charger', 'headphones', 'power-adapter', 'power-bank'],
  prepared: ['first-aid', 'medications', 'day-backpack', 'umbrella', 'sleep-mask', 'insurance', 'water-bottle', 'power-bank', 'hand-sanitizer'],
}

export function resolveItems(
  gender: Gender,
  traveler: TravelerType,
  travelType: TravelType,
): ResolvedItem[] {
  const hideSet = new Set([...TRAVEL_HIDE[travelType], ...TRAVELER_HIDE[traveler]])
  const essentialSet = new Set([...TRAVEL_ESSENTIALS[travelType], ...TRAVELER_ESSENTIALS[traveler]])
  return ITEMS.flatMap((it) => {
    if (it.gender && it.gender !== gender) return []
    if (it.onlyTravelTypes && !it.onlyTravelTypes.includes(travelType)) return []
    // A trip/traveler essential is never hidden by the *other* axis' hide list
    // (e.g. Lean hides the sweater, but a Ski trip still needs it).
    if (hideSet.has(it.id) && !essentialSet.has(it.id)) return []
    return [{ ...it, essential: !!it.essential || essentialSet.has(it.id) } as ResolvedItem]
  })
}

/* ------------------------------------------------------------------ quantities */

/** Days of clothing to carry: never more than one laundry cycle (N days + 1 spare). */
export function clothingDays(trip: Pick<TripState, 'days' | 'laundryDays'>): number {
  return Math.min(trip.days, trip.laundryDays + 1)
}

/** The suggested quantity before any manual override. */
export function suggestedQty(
  item: PackItem,
  trip: Pick<TripState, 'days' | 'laundryDays' | 'travelerType'>,
): number {
  if (item.fixed) return 1
  const raw = item.basePerDay * clothingDays(trip) * PER_DAY_FACTOR[trip.travelerType]
  // The epsilon keeps float noise (0.3 * 10 = 3.0000000000000004) from adding a unit.
  return Math.max(1, Math.ceil(raw - 1e-9))
}

/** The quantity on the list (manual override if any, else the suggestion). */
export function listQty(item: PackItem, trip: TripState): number {
  return trip.overrides[item.id] ?? suggestedQty(item, trip)
}

/** Units of this item worn on the travel day (0 or 1, never more than listed). */
export function wornQty(item: PackItem, trip: TripState): number {
  if (!item.wearable || !trip.worn.includes(item.id)) return 0
  return Math.min(1, listQty(item, trip))
}

/** Units that actually go in the bag. */
export function bagQty(item: PackItem, trip: TripState): number {
  return listQty(item, trip) - wornQty(item, trip)
}

/* ------------------------------------------------------------------ totals + verdict */

export interface Totals {
  /** Everything below is for the bag only: worn units are excluded. */
  weightKg: number
  volumeL: number
  count: number
  /** What you wear on the travel day (shown separately, never in the bag). */
  wornWeightKg: number
  wornCount: number
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

export function computeTotals(items: readonly PackItem[], trip: TripState): Totals {
  let w = 0, v = 0, n = 0, ww = 0, wn = 0
  for (const it of items) {
    const bag = bagQty(it, trip)
    const worn = wornQty(it, trip)
    w += bag * it.weightKg
    v += bag * it.volumeL
    n += bag
    ww += worn * it.weightKg
    wn += worn
  }
  return { weightKg: round3(w), volumeL: round3(v), count: n, wornWeightKg: round3(ww), wornCount: wn }
}

export type LuggageKey = 'backpack' | 'carryOn' | 'suitcase'

export interface Verdict {
  nameKey: LuggageKey
  tier: 1 | 2 | 3
  /** Bag weight is over the chosen allowance. */
  overLimit: boolean
  /** How much would need to come out to get back under the chosen allowance. */
  overByKg: number
  /**
   * Why a cabin-sized bag was ruled out (tier 3 only): it was too heavy for a
   * cabin bag, too bulky, or both. null when a cabin tier was chosen.
   */
  cabinBlockedBy: 'weight' | 'volume' | 'both' | null
}

/**
 * Pick the smallest bag that passes BOTH volume and weight.
 * Cabin tiers (backpack, carry-on) need weight within the chosen limit when it
 * is a cabin limit, or within CABIN_MAX_KG when a hold limit is chosen.
 */
export function chooseLuggage(weightKg: number, volumeL: number, limitKg: BagLimit): Verdict {
  const cabinCap = Math.min(limitKg, CABIN_MAX_KG)
  const overByKg = round3(Math.max(0, weightKg - limitKg))
  const overLimit = overByKg > 0
  const weightOk = weightKg <= cabinCap
  if (weightOk && volumeL <= BACKPACK_MAX_L)
    return { nameKey: 'backpack', tier: 1, overLimit, overByKg, cabinBlockedBy: null }
  if (weightOk && volumeL <= CARRY_ON_MAX_L)
    return { nameKey: 'carryOn', tier: 2, overLimit, overByKg, cabinBlockedBy: null }
  const tooBulky = volumeL > CARRY_ON_MAX_L
  return {
    nameKey: 'suitcase',
    tier: 3,
    overLimit,
    overByKg,
    cabinBlockedBy: !weightOk && tooBulky ? 'both' : !weightOk ? 'weight' : 'volume',
  }
}

/** Convenience: resolve the list for a trip and compute everything at once. */
export function evaluateTrip(trip: TripState) {
  const items = resolveItems(trip.gender, trip.travelerType, trip.travelType)
  const totals = computeTotals(items, trip)
  const verdict = chooseLuggage(totals.weightKg, totals.volumeL, trip.limitKg)
  return { items, totals, verdict }
}
