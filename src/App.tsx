import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'

/* ============================================================ TYPES ============================================================ */

type Lang = 'en' | 'ru' | 'bg' | 'he'
type Gender = 'male' | 'female'
type TravelerType = 'lean' | 'it' | 'prepared'
type TravelType = 'city' | 'summer' | 'ski' | 'hiking' | 'business'

type Category =
  | 'documents'
  | 'electronics'
  | 'clothing'
  | 'outerwear'
  | 'footwear'
  | 'toiletries'
  | 'health'
  | 'extras'
  | 'specialty'

interface PackItem {
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
}

interface ResolvedItem extends PackItem {
  /** Final essential flag after traveler / travel type rules applied. */
  essential: boolean
}

interface AppState {
  days: number
  gender: Gender
  travelerType: TravelerType
  travelType: TravelType
  overrides: Record<string, number>
}

interface Snapshot {
  id: string
  name: string
  savedAt: number
  state: AppState
}

interface Warning {
  type: 'over' | 'under'
  msg: string
}

interface Luggage {
  nameKey: 'backpack' | 'carryOn' | 'suitcase'
  emoji: string
  tier: 1 | 2 | 3
}

/* ============================================================ ITEMS ============================================================ */

const CATEGORY_ORDER: Category[] = [
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

const CATEGORY_EMOJI: Record<Category, string> = {
  documents: '📑',
  electronics: '🔌',
  clothing: '👕',
  outerwear: '🧥',
  footwear: '👟',
  toiletries: '🧼',
  health: '💊',
  extras: '🌍',
  specialty: '⛰️',
}

const ITEMS: PackItem[] = [
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
  { id: 'tshirts',   emoji: '👕', category: 'clothing', basePerDay: 1,    weightKg: 0.18, volumeL: 0.60, fixed: false, essential: true },
  { id: 'underwear', emoji: '🩲', category: 'clothing', basePerDay: 1,    weightKg: 0.05, volumeL: 0.15, fixed: false, essential: true },
  { id: 'socks',     emoji: '🧦', category: 'clothing', basePerDay: 1,    weightKg: 0.06, volumeL: 0.20, fixed: false, essential: true },
  { id: 'pants',     emoji: '👖', category: 'clothing', basePerDay: 0.34, weightKg: 0.55, volumeL: 1.20, fixed: false },
  { id: 'shorts',      emoji: '🩳', category: 'clothing', basePerDay: 0.30, weightKg: 0.25, volumeL: 0.60, fixed: false },
  { id: 'dress-shirt', emoji: '👔', category: 'clothing', basePerDay: 0.50, weightKg: 0.25, volumeL: 0.80, fixed: false, onlyTravelTypes: ['city', 'business'] },
  { id: 'pajamas',   emoji: '🛌', category: 'clothing', basePerDay: 0,    weightKg: 0.30, volumeL: 0.70, fixed: true },
  { id: 'swimwear',  emoji: '🩳', category: 'clothing', basePerDay: 0,    weightKg: 0.15, volumeL: 0.30, fixed: true },

  // Outerwear
  { id: 'sweater',     emoji: '🧶', category: 'outerwear', basePerDay: 0, weightKg: 0.50, volumeL: 1.80, fixed: true },
  { id: 'jacket',      emoji: '🧥', category: 'outerwear', basePerDay: 0, weightKg: 0.90, volumeL: 3.50, fixed: true },
  { id: 'rain-jacket', emoji: '☔', category: 'outerwear', basePerDay: 0, weightKg: 0.30, volumeL: 0.80, fixed: true },
  { id: 'blazer',      emoji: '🧥', category: 'outerwear', basePerDay: 0, weightKg: 0.70, volumeL: 3.00, fixed: true, onlyTravelTypes: ['business'] },

  // Footwear
  { id: 'sneakers',    emoji: '👟', category: 'footwear', basePerDay: 0, weightKg: 0.80, volumeL: 2.50, fixed: true, essential: true },
  { id: 'sandals',     emoji: '🩴', category: 'footwear', basePerDay: 0, weightKg: 0.30, volumeL: 1.00, fixed: true },
  { id: 'dress-shoes', emoji: '👞', category: 'footwear', basePerDay: 0, weightKg: 0.70, volumeL: 2.00, fixed: true },

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
  { id: 'sunglasses',   emoji: '🕶️', category: 'extras', basePerDay: 0, weightKg: 0.05, volumeL: 0.20, fixed: true },
  { id: 'day-backpack', emoji: '🎒', category: 'extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },
  { id: 'umbrella',     emoji: '☂️', category: 'extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },

  // Specialty Gear (gated by travel type)
  { id: 'ski-gloves',    emoji: '🧤', category: 'specialty', basePerDay: 0, weightKg: 0.20, volumeL: 0.60, fixed: true, onlyTravelTypes: ['ski'] },
  { id: 'ski-goggles',   emoji: '🥽', category: 'specialty', basePerDay: 0, weightKg: 0.15, volumeL: 0.40, fixed: true, onlyTravelTypes: ['ski'] },
  { id: 'beanie',        emoji: '🎿', category: 'specialty', basePerDay: 0, weightKg: 0.10, volumeL: 0.30, fixed: true, onlyTravelTypes: ['ski'] },
  { id: 'hiking-boots',  emoji: '🥾', category: 'specialty', basePerDay: 0, weightKg: 1.10, volumeL: 3.00, fixed: true, onlyTravelTypes: ['hiking'] },
  { id: 'beach-towel',   emoji: '🏖️', category: 'specialty', basePerDay: 0, weightKg: 0.40, volumeL: 1.40, fixed: true, onlyTravelTypes: ['summer'] },
  { id: 'necktie',       emoji: '👔', category: 'specialty', basePerDay: 0, weightKg: 0.10, volumeL: 0.30, fixed: true, onlyTravelTypes: ['business'] },
]

/* ============================================================ PROFILE RULES ============================================================ */

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

function resolveItems(
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

/* ============================================================ I18N ============================================================ */

interface Translations {
  tagline: string
  subtitle: string
  kpi: { items: string; weight: string; volume: string }
  units: { kg: string; l: string }
  controls: {
    tripLength: string
    day: string
    days: string
    traveler: string
    travelerHint: string
    gender: string
    genderHint: string
    male: string
    female: string
    travelType: string
    travelTypeHint: string
  }
  list: {
    title: string
    breakdown: (n: number, c: number, d: number) => string
    pieces: (n: number) => string
    fixedItem: string
    suggested: string
    perDay: string
    essential: string
    genderTag: { male: string; female: string }
  }
  telemetry: { title: string; volume: string; weight: string }
  luggage: {
    title: string
    backpack: string
    carryOn: string
    suitcase: string
    capacityUpTo: (n: number) => string
    capacityBetween: (a: number, b: number) => string
    capacityOver: (n: number) => string
    barBackpack: string
    barCarryOn: string
    barSuitcase: string
    tier: (n: number) => string
  }
  snapshots: {
    title: string
    placeholder: string
    save: string
    empty: string
    load: string
    delete: string
    autoSaved: string
    confirmDelete: string
  }
  warnings: {
    overweight: (kg: string) => string
    overvolume: (l: string) => string
    overpacked: (emoji: string, name: string, qty: number, sugg: number) => string
    fixedOver: (emoji: string, name: string, qty: number) => string
    essential0: (emoji: string, name: string) => string
    lowScaling: (emoji: string, name: string, qty: number, days: number, sugg: number) => string
  }
  categories: Record<Category, string>
  travelers: Record<TravelerType, { name: string; tagline: string; emoji: string }>
  travelTypes: Record<TravelType, { name: string; emoji: string }>
  items: Record<string, string>
  pack: {
    label: string
    progress: (n: number, total: number) => string
    allPacked: string
    clear: string
    checkAria: (name: string) => string
  }
  share: { button: string; copied: string }
  print: string
  footer: string
  language: string
}

const LANGS: { code: Lang; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
]

/** Languages that render right-to-left. */
const RTL_LANGS = new Set<Lang>(['he'])
const isRtl = (l: Lang) => RTL_LANGS.has(l)
const dirOf = (l: Lang): 'rtl' | 'ltr' => (isRtl(l) ? 'rtl' : 'ltr')

/** Short day suffix used in auto-generated snapshot names. */
const DAY_SUFFIX: Record<Lang, string> = { en: 'd', ru: 'дн', bg: 'дн', he: 'ד' }

const TRAVELER_EMOJI: Record<TravelerType, string> = { lean: '🪶', it: '💻', prepared: '🛡️' }
const TRAVEL_TYPE_EMOJI: Record<TravelType, string> = {
  city: '🏙️',
  summer: '🏖️',
  ski: '⛷️',
  hiking: '🥾',
  business: '💼',
}

const T_EN: Translations = {
  tagline: 'Smart packing for any trip',
  subtitle: 'Powered by math, not vibes. Set your trip, the list balances itself.',
  kpi: { items: 'Items', weight: 'Weight', volume: 'Volume' },
  units: { kg: 'kg', l: 'L' },
  controls: {
    tripLength: 'Trip length',
    day: 'day',
    days: 'days',
    traveler: 'Traveler profile',
    travelerHint: 'tunes the essentials',
    gender: 'Hygiene profile',
    genderHint: 'shows the matching kit',
    male: 'Male',
    female: 'Female',
    travelType: 'Trip type',
    travelTypeHint: 'shapes the gear list',
  },
  list: {
    title: 'Packing list',
    breakdown: (n, c, d) => `${n} items · ${c} categories · ${d}d`,
    pieces: (n) => (n === 1 ? '1 piece' : `${n} pieces`),
    fixedItem: 'Fixed item',
    suggested: 'suggested',
    perDay: '/ day',
    essential: 'essential',
    genderTag: { male: 'male', female: 'female' },
  },
  telemetry: { title: 'Live telemetry', volume: 'Volume', weight: 'Weight' },
  luggage: {
    title: 'Recommended luggage',
    backpack: 'Compact Backpack',
    carryOn: 'Carry-on Trolley',
    suitcase: 'Large Rolling Suitcase',
    capacityUpTo: (n) => `up to ${n} L`,
    capacityBetween: (a, b) => `${a} – ${b} L`,
    capacityOver: (n) => `${n} L +`,
    barBackpack: 'Backpack',
    barCarryOn: 'Carry-on',
    barSuitcase: 'Suitcase',
    tier: (n) => `tier ${n}/3`,
  },
  snapshots: {
    title: 'Saved trips',
    placeholder: 'Name this trip (e.g. Sofia weekend)',
    save: 'Save trip',
    empty: 'No saved trips yet. Save the current setup to compare later.',
    load: 'Load',
    delete: 'Delete',
    autoSaved: 'Auto-saved locally',
    confirmDelete: 'Delete this saved trip?',
  },
  warnings: {
    overweight: (kg) => `Total weight is ${kg} kg — that's over the standard 20 kg airline allowance.`,
    overvolume: (l) => `Total volume is ${l} L — past carry-on size, consider trimming the list.`,
    overpacked: (emoji, name, qty, sugg) => `${emoji} ${name}: ${qty} is more than double the suggested ${sugg}.`,
    fixedOver: (emoji, name, qty) => `${emoji} ${name}: ${qty} feels excessive for a single-item essential.`,
    essential0: (emoji, name) => `${emoji} ${name} is at 0 — you can't leave home without it!`,
    lowScaling: (emoji, name, qty, days, sugg) => `${emoji} ${name}: only ${qty} for a ${days}-day trip (suggested ${sugg}) — you'll run out.`,
  },
  categories: {
    documents: 'Documents & Money',
    electronics: 'Electronics',
    clothing: 'Clothing',
    outerwear: 'Outerwear',
    footwear: 'Footwear',
    toiletries: 'Toiletries',
    health: 'Health & Comfort',
    extras: 'Travel Extras',
    specialty: 'Specialty Gear',
  },
  travelers: {
    lean:     { name: 'Lean',     tagline: 'Bare minimum, fast moves',  emoji: TRAVELER_EMOJI.lean },
    it:       { name: 'IT Pro',   tagline: 'Tech-heavy load-out',       emoji: TRAVELER_EMOJI.it },
    prepared: { name: 'Prepared', tagline: 'Ready for anything',        emoji: TRAVELER_EMOJI.prepared },
  },
  travelTypes: {
    city:     { name: 'City',           emoji: TRAVEL_TYPE_EMOJI.city },
    summer:   { name: 'Beach / Summer', emoji: TRAVEL_TYPE_EMOJI.summer },
    ski:      { name: 'Ski / Snow',     emoji: TRAVEL_TYPE_EMOJI.ski },
    hiking:   { name: 'Hiking',         emoji: TRAVEL_TYPE_EMOJI.hiking },
    business: { name: 'Business',       emoji: TRAVEL_TYPE_EMOJI.business },
  },
  items: {
    passport: 'Passport', wallet: 'Wallet', 'id-card': 'ID Card',
    'cash-cards': 'Cash & Cards', insurance: 'Travel Insurance Docs',
    phone: 'Phone', charger: 'Phone Charger', 'power-adapter': 'Power Adapter',
    headphones: 'Headphones', laptop: 'Laptop', 'laptop-charger': 'Laptop Charger',
    camera: 'Camera',
    tshirts: 'T-Shirts', underwear: 'Underwear', socks: 'Socks',
    pants: 'Pants / Jeans', pajamas: 'Pajamas', swimwear: 'Swimwear',
    sweater: 'Sweater / Hoodie', jacket: 'Heavy Jacket', 'rain-jacket': 'Rain Jacket',
    sneakers: 'Sneakers', sandals: 'Sandals / Flip-flops', 'dress-shoes': 'Dress Shoes',
    toothbrush: 'Toothbrush', toothpaste: 'Toothpaste',
    soap: 'Soap & Body Wash', shampoo: 'Shampoo & Conditioner',
    deodorant: 'Deodorant', sunscreen: 'Sunscreen', chapstick: 'Chapstick',
    shaving: 'Shaving Kit', makeup: 'Makeup & Hygiene Kit',
    medications: 'Medications', 'first-aid': 'First Aid Kit',
    'travel-pillow': 'Travel Pillow', 'sleep-mask': 'Eye Mask & Earplugs',
    'water-bottle': 'Reusable Water Bottle', book: 'Book / E-Reader',
    sunglasses: 'Sunglasses', 'day-backpack': 'Day Backpack (folded)',
    umbrella: 'Compact Umbrella',
    'ski-gloves': 'Ski Gloves', 'ski-goggles': 'Ski Goggles', beanie: 'Beanie / Wool Hat',
    'hiking-boots': 'Hiking Boots', 'beach-towel': 'Beach Towel', necktie: 'Necktie',
    'power-bank': 'Power Bank', shorts: 'Shorts',
    'dress-shirt': 'Dress Shirt / Blouse', blazer: 'Blazer / Sport Coat',
    'hand-sanitizer': 'Hand Sanitizer', 'period-care': 'Period Products',
    'insect-repellent': 'Insect Repellent',
  },
  pack: {
    label: 'Packing progress',
    progress: (n, total) => `${n} / ${total} packed`,
    allPacked: 'All packed — you are ready to go!',
    clear: 'Uncheck all',
    checkAria: (name) => `Mark ${name} as packed`,
  },
  share: { button: 'Share trip', copied: 'Link copied!' },
  print: 'Print / PDF',
  footer: 'PackMate · pack light, travel far.',
  language: 'Language',
}

const T_RU: Translations = {
  tagline: 'Умная упаковка для любой поездки',
  subtitle: 'Расчёт, а не интуиция. Задаёте параметры — список считается сам.',
  kpi: { items: 'Предметы', weight: 'Вес', volume: 'Объём' },
  units: { kg: 'кг', l: 'л' },
  controls: {
    tripLength: 'Длительность',
    day: 'день',
    days: 'дн.',
    traveler: 'Профиль путешественника',
    travelerHint: 'настраивает обязательное',
    gender: 'Профиль гигиены',
    genderHint: 'показывает нужный набор',
    male: 'Мужской',
    female: 'Женский',
    travelType: 'Тип поездки',
    travelTypeHint: 'формирует список снаряжения',
  },
  list: {
    title: 'Список вещей',
    breakdown: (n, c, d) => `${n} предм. · ${c} кат. · ${d} дн.`,
    pieces: (n) => `${n} шт.`,
    fixedItem: 'Фикс. предмет',
    suggested: 'нужно',
    perDay: '/ день',
    essential: 'обязательно',
    genderTag: { male: 'муж.', female: 'жен.' },
  },
  telemetry: { title: 'Текущие показатели', volume: 'Объём', weight: 'Вес' },
  luggage: {
    title: 'Рекомендуемый багаж',
    backpack: 'Компактный рюкзак',
    carryOn: 'Ручная кладь',
    suitcase: 'Большой чемодан',
    capacityUpTo: (n) => `до ${n} л`,
    capacityBetween: (a, b) => `${a} – ${b} л`,
    capacityOver: (n) => `${n} л +`,
    barBackpack: 'Рюкзак',
    barCarryOn: 'Ручная',
    barSuitcase: 'Чемодан',
    tier: (n) => `${n}/3`,
  },
  snapshots: {
    title: 'Сохранённые поездки',
    placeholder: 'Название поездки (напр., «Уикенд в Софии»)',
    save: 'Сохранить',
    empty: 'Пока ничего не сохранено. Сохраните текущий набор, чтобы вернуться к нему.',
    load: 'Загрузить',
    delete: 'Удалить',
    autoSaved: 'Автосохранено локально',
    confirmDelete: 'Удалить эту поездку?',
  },
  warnings: {
    overweight: (kg) => `Общий вес ${kg} кг — это больше стандартного лимита 20 кг.`,
    overvolume: (l) => `Общий объём ${l} л — это больше ручной клади, лучше что-то убрать.`,
    overpacked: (emoji, name, qty, sugg) => `${emoji} ${name}: ${qty} — это более чем вдвое от ${sugg} рекомендованных.`,
    fixedOver: (emoji, name, qty) => `${emoji} ${name}: ${qty} — слишком много для одного предмета.`,
    essential0: (emoji, name) => `${emoji} ${name} = 0 — без этого нельзя!`,
    lowScaling: (emoji, name, qty, days, sugg) => `${emoji} ${name}: всего ${qty} на ${days} дн. (нужно ${sugg}) — не хватит.`,
  },
  categories: {
    documents: 'Документы и деньги',
    electronics: 'Электроника',
    clothing: 'Одежда',
    outerwear: 'Верхняя одежда',
    footwear: 'Обувь',
    toiletries: 'Гигиена',
    health: 'Здоровье и комфорт',
    extras: 'Дорожные мелочи',
    specialty: 'Специальное снаряжение',
  },
  travelers: {
    lean:     { name: 'Минимум',       tagline: 'Только самое нужное',     emoji: TRAVELER_EMOJI.lean },
    it:       { name: 'IT-специалист', tagline: 'Полный технический набор', emoji: TRAVELER_EMOJI.it },
    prepared: { name: 'Подготовленный',tagline: 'Готов ко всему',           emoji: TRAVELER_EMOJI.prepared },
  },
  travelTypes: {
    city:     { name: 'Город',       emoji: TRAVEL_TYPE_EMOJI.city },
    summer:   { name: 'Пляж / лето', emoji: TRAVEL_TYPE_EMOJI.summer },
    ski:      { name: 'Лыжи / снег', emoji: TRAVEL_TYPE_EMOJI.ski },
    hiking:   { name: 'Поход',       emoji: TRAVEL_TYPE_EMOJI.hiking },
    business: { name: 'Бизнес',      emoji: TRAVEL_TYPE_EMOJI.business },
  },
  items: {
    passport: 'Паспорт', wallet: 'Кошелёк', 'id-card': 'Удостоверение',
    'cash-cards': 'Наличные и карты', insurance: 'Страховые документы',
    phone: 'Телефон', charger: 'Зарядка для телефона', 'power-adapter': 'Сетевой адаптер',
    headphones: 'Наушники', laptop: 'Ноутбук', 'laptop-charger': 'Зарядка для ноутбука',
    camera: 'Камера',
    tshirts: 'Футболки', underwear: 'Нижнее бельё', socks: 'Носки',
    pants: 'Брюки / джинсы', pajamas: 'Пижама', swimwear: 'Купальник / плавки',
    sweater: 'Свитер / худи', jacket: 'Тёплая куртка', 'rain-jacket': 'Дождевик',
    sneakers: 'Кроссовки', sandals: 'Сандалии / шлёпанцы', 'dress-shoes': 'Туфли',
    toothbrush: 'Зубная щётка', toothpaste: 'Зубная паста',
    soap: 'Мыло / гель', shampoo: 'Шампунь и кондиционер',
    deodorant: 'Дезодорант', sunscreen: 'Солнцезащитный крем', chapstick: 'Гигиеническая помада',
    shaving: 'Бритвенный набор', makeup: 'Косметика и гигиена',
    medications: 'Лекарства', 'first-aid': 'Аптечка',
    'travel-pillow': 'Дорожная подушка', 'sleep-mask': 'Маска для сна и беруши',
    'water-bottle': 'Бутылка для воды', book: 'Книга / читалка',
    sunglasses: 'Солнечные очки', 'day-backpack': 'Складной рюкзак',
    umbrella: 'Компактный зонт',
    'ski-gloves': 'Лыжные перчатки', 'ski-goggles': 'Лыжные очки', beanie: 'Шапка',
    'hiking-boots': 'Походные ботинки', 'beach-towel': 'Пляжное полотенце', necktie: 'Галстук',
    'power-bank': 'Внешний аккумулятор', shorts: 'Шорты',
    'dress-shirt': 'Рубашка / блузка', blazer: 'Пиджак',
    'hand-sanitizer': 'Антисептик для рук', 'period-care': 'Средства гигиены',
    'insect-repellent': 'Средство от насекомых',
  },
  pack: {
    label: 'Прогресс сборов',
    progress: (n, total) => `${n} / ${total} собрано`,
    allPacked: 'Всё собрано — можно в путь!',
    clear: 'Снять отметки',
    checkAria: (name) => `Отметить «${name}» как собранное`,
  },
  share: { button: 'Поделиться', copied: 'Ссылка скопирована!' },
  print: 'Печать / PDF',
  footer: 'PackMate · меньше вещей — больше дорог.',
  language: 'Язык',
}

const T_BG: Translations = {
  tagline: 'Умно стягане за всяко пътуване',
  subtitle: 'Сметката е наука, не интуиция. Задаваш дните — списъкът се сглобява сам.',
  kpi: { items: 'Предмети', weight: 'Тегло', volume: 'Обем' },
  units: { kg: 'кг', l: 'л' },
  controls: {
    tripLength: 'Дължина на пътуването',
    day: 'ден',
    days: 'дни',
    traveler: 'Профил на пътуващия',
    travelerHint: 'настройва задължителното',
    gender: 'Хигиенен профил',
    genderHint: 'показва съответния комплект',
    male: 'Мъжки',
    female: 'Женски',
    travelType: 'Вид пътуване',
    travelTypeHint: 'оформя списъка с екипировка',
  },
  list: {
    title: 'Списък за стягане',
    breakdown: (n, c, d) => `${n} предмета · ${c} категории · ${d} дни`,
    pieces: (n) => `${n} бр.`,
    fixedItem: 'Фикс. предмет',
    suggested: 'препоръчани',
    perDay: '/ ден',
    essential: 'задължително',
    genderTag: { male: 'мъжки', female: 'женски' },
  },
  telemetry: { title: 'Текуща телеметрия', volume: 'Обем', weight: 'Тегло' },
  luggage: {
    title: 'Препоръчан багаж',
    backpack: 'Компактна раница',
    carryOn: 'Ръчен багаж',
    suitcase: 'Голям куфар',
    capacityUpTo: (n) => `до ${n} л`,
    capacityBetween: (a, b) => `${a} – ${b} л`,
    capacityOver: (n) => `${n} л +`,
    barBackpack: 'Раница',
    barCarryOn: 'Ръчен',
    barSuitcase: 'Куфар',
    tier: (n) => `ниво ${n}/3`,
  },
  snapshots: {
    title: 'Запазени пътувания',
    placeholder: 'Име на пътуването (напр. „Уикенд в София“)',
    save: 'Запази',
    empty: 'Все още няма запазени пътувания. Запази текущата конфигурация, за да я сравниш.',
    load: 'Зареди',
    delete: 'Изтрий',
    autoSaved: 'Автоматично запазено локално',
    confirmDelete: 'Да изтрия ли това пътуване?',
  },
  warnings: {
    overweight: (kg) => `Общото тегло е ${kg} кг — над стандартния лимит от 20 кг.`,
    overvolume: (l) => `Общият обем е ${l} л — над размера на ръчен багаж, орежи нещо.`,
    overpacked: (emoji, name, qty, sugg) => `${emoji} ${name}: ${qty} е повече от двойно над препоръчаните ${sugg}.`,
    fixedOver: (emoji, name, qty) => `${emoji} ${name}: ${qty} е твърде много за един предмет.`,
    essential0: (emoji, name) => `${emoji} ${name} е на 0 — не може без него!`,
    lowScaling: (emoji, name, qty, days, sugg) => `${emoji} ${name}: само ${qty} за ${days} дни (нужни ${sugg}) — няма да стигнат.`,
  },
  categories: {
    documents: 'Документи и пари',
    electronics: 'Електроника',
    clothing: 'Облекло',
    outerwear: 'Връхни дрехи',
    footwear: 'Обувки',
    toiletries: 'Тоалетни принадлежности',
    health: 'Здраве и комфорт',
    extras: 'Дребни неща за път',
    specialty: 'Специална екипировка',
  },
  travelers: {
    lean:     { name: 'Минимално',         tagline: 'Само най-нужното',          emoji: TRAVELER_EMOJI.lean },
    it:       { name: 'IT професионалист', tagline: 'Пълен техноарсенал',        emoji: TRAVELER_EMOJI.it },
    prepared: { name: 'Подготвен',         tagline: 'Готов за всичко',           emoji: TRAVELER_EMOJI.prepared },
  },
  travelTypes: {
    city:     { name: 'Градско',     emoji: TRAVEL_TYPE_EMOJI.city },
    summer:   { name: 'Плаж / лято', emoji: TRAVEL_TYPE_EMOJI.summer },
    ski:      { name: 'Ски / сняг',  emoji: TRAVEL_TYPE_EMOJI.ski },
    hiking:   { name: 'Туризъм',     emoji: TRAVEL_TYPE_EMOJI.hiking },
    business: { name: 'Бизнес',      emoji: TRAVEL_TYPE_EMOJI.business },
  },
  items: {
    passport: 'Паспорт', wallet: 'Портфейл', 'id-card': 'Лична карта',
    'cash-cards': 'Пари и карти', insurance: 'Застрахователни документи',
    phone: 'Телефон', charger: 'Зарядно за телефон', 'power-adapter': 'Захранващ адаптер',
    headphones: 'Слушалки', laptop: 'Лаптоп', 'laptop-charger': 'Зарядно за лаптоп',
    camera: 'Фотоапарат',
    tshirts: 'Тениски', underwear: 'Бельо', socks: 'Чорапи',
    pants: 'Панталони / дънки', pajamas: 'Пижама', swimwear: 'Бански',
    sweater: 'Пуловер / суичър', jacket: 'Топло яке', 'rain-jacket': 'Дъждобран',
    sneakers: 'Маратонки', sandals: 'Сандали / джапанки', 'dress-shoes': 'Официални обувки',
    toothbrush: 'Четка за зъби', toothpaste: 'Паста за зъби',
    soap: 'Сапун / душ-гел', shampoo: 'Шампоан и балсам',
    deodorant: 'Дезодорант', sunscreen: 'Слънцезащитен крем', chapstick: 'Балсам за устни',
    shaving: 'Комплект за бръснене', makeup: 'Грим и хигиена',
    medications: 'Лекарства', 'first-aid': 'Аптечка',
    'travel-pillow': 'Възглавница за път', 'sleep-mask': 'Маска за очи и тапи',
    'water-bottle': 'Бутилка за вода', book: 'Книга / е-четец',
    sunglasses: 'Слънчеви очила', 'day-backpack': 'Сгъваема раница',
    umbrella: 'Компактен чадър',
    'ski-gloves': 'Ски ръкавици', 'ski-goggles': 'Ски очила', beanie: 'Шапка',
    'hiking-boots': 'Туристически обувки', 'beach-towel': 'Плажна кърпа', necktie: 'Вратовръзка',
    'power-bank': 'Външна батерия', shorts: 'Къси панталони',
    'dress-shirt': 'Риза / блуза', blazer: 'Сако',
    'hand-sanitizer': 'Дезинфектант за ръце', 'period-care': 'Дамски продукти',
    'insect-repellent': 'Репелент против насекоми',
  },
  pack: {
    label: 'Прогрес на стягането',
    progress: (n, total) => `${n} / ${total} събрани`,
    allPacked: 'Всичко е събрано — готови сте!',
    clear: 'Изчисти отметките',
    checkAria: (name) => `Отбележи „${name}“ като събрано`,
  },
  share: { button: 'Сподели', copied: 'Връзката е копирана!' },
  print: 'Печат / PDF',
  footer: 'PackMate · стягай леко, пътувай далече.',
  language: 'Език',
}

const T_HE: Translations = {
  tagline: 'אריזה חכמה לכל טיול',
  subtitle: 'מבוסס על חישוב, לא על תחושה. מגדירים את הטיול והרשימה מסתדרת לבד.',
  kpi: { items: 'פריטים', weight: 'משקל', volume: 'נפח' },
  units: { kg: 'ק"ג', l: 'ל׳' },
  controls: {
    tripLength: 'משך הטיול',
    day: 'יום',
    days: 'ימים',
    traveler: 'פרופיל מטייל',
    travelerHint: 'מכוונן את החיוניים',
    gender: 'מגדר',
    genderHint: 'מציג את הערכה המתאימה',
    male: 'גבר',
    female: 'אישה',
    travelType: 'סוג הטיול',
    travelTypeHint: 'מעצב את רשימת הציוד',
  },
  list: {
    title: 'רשימת אריזה',
    breakdown: (n, c, d) => `${n} פריטים · ${c} קטגוריות · ${d} ימים`,
    pieces: (n) => `${n} ${n === 1 ? 'יחידה' : 'יחידות'}`,
    fixedItem: 'פריט קבוע',
    suggested: 'מומלץ',
    perDay: '/ יום',
    essential: 'חיוני',
    genderTag: { male: 'גבר', female: 'אישה' },
  },
  telemetry: { title: 'נתונים בזמן אמת', volume: 'נפח', weight: 'משקל' },
  luggage: {
    title: 'מזוודה מומלצת',
    backpack: 'תיק גב',
    carryOn: 'טרולי',
    suitcase: 'מזוודה גדולה',
    capacityUpTo: (n) => `עד ${n} ליטר`,
    capacityBetween: (a, b) => `${a} – ${b} ליטר`,
    capacityOver: (n) => `${n} ליטר ומעלה`,
    barBackpack: 'תיק גב',
    barCarryOn: 'טרולי',
    barSuitcase: 'מזוודה',
    tier: (n) => `רמה ${n}/3`,
  },
  snapshots: {
    title: 'טיולים שמורים',
    placeholder: 'שם לטיול (למשל: סופ״ש בסופיה)',
    save: 'שמירה',
    empty: 'אין עדיין טיולים שמורים. שמרו את ההגדרה הנוכחית כדי להשוות בהמשך.',
    load: 'טעינה',
    delete: 'מחיקה',
    autoSaved: 'נשמר אוטומטית',
    confirmDelete: 'למחוק את הטיול השמור?',
  },
  warnings: {
    overweight: (kg) => `המשקל הכולל הוא ${kg} ק"ג — מעל מכסת 20 ק"ג הרגילה של חברות התעופה.`,
    overvolume: (l) => `הנפח הכולל הוא ${l} ליטר — מעבר לגודל של מזוודת יד, כדאי לצמצם.`,
    overpacked: (emoji, name, qty, sugg) => `${emoji} ${name}: ${qty} — יותר מפי שניים מ-${sugg} המומלצים.`,
    fixedOver: (emoji, name, qty) => `${emoji} ${name}: ${qty} — הרבה מדי לפריט יחיד.`,
    essential0: (emoji, name) => `${emoji} ${name} על 0 — אי אפשר בלי זה!`,
    lowScaling: (emoji, name, qty, days, sugg) => `${emoji} ${name}: רק ${qty} ל-${days} ימים (מומלץ ${sugg}) — לא יספיק.`,
  },
  categories: {
    documents: 'מסמכים וכסף',
    electronics: 'אלקטרוניקה',
    clothing: 'ביגוד',
    outerwear: 'ביגוד עליון',
    footwear: 'הנעלה',
    toiletries: 'כלי רחצה',
    health: 'בריאות ונוחות',
    extras: 'עוד לדרך',
    specialty: 'ציוד מיוחד',
  },
  travelers: {
    lean:     { name: 'מינימלי',   tagline: 'רק ההכרחי, קליל ומהיר', emoji: TRAVELER_EMOJI.lean },
    it:       { name: 'איש הייטק', tagline: 'ערכת טכנולוגיה מלאה',    emoji: TRAVELER_EMOJI.it },
    prepared: { name: 'מוכן לכול', tagline: 'ערוך לכל תרחיש',         emoji: TRAVELER_EMOJI.prepared },
  },
  travelTypes: {
    city:     { name: 'עירוני',    emoji: TRAVEL_TYPE_EMOJI.city },
    summer:   { name: 'ים / קיץ',  emoji: TRAVEL_TYPE_EMOJI.summer },
    ski:      { name: 'סקי / שלג', emoji: TRAVEL_TYPE_EMOJI.ski },
    hiking:   { name: 'טרקים',     emoji: TRAVEL_TYPE_EMOJI.hiking },
    business: { name: 'עסקים',     emoji: TRAVEL_TYPE_EMOJI.business },
  },
  items: {
    passport: 'דרכון', wallet: 'ארנק', 'id-card': 'תעודת זהות',
    'cash-cards': 'מזומן וכרטיסים', insurance: 'מסמכי ביטוח נסיעות',
    phone: 'טלפון', charger: 'מטען לטלפון', 'power-adapter': 'מתאם חשמל',
    headphones: 'אוזניות', laptop: 'מחשב נייד', 'laptop-charger': 'מטען למחשב נייד',
    camera: 'מצלמה',
    tshirts: 'חולצות טי', underwear: 'הלבשה תחתונה', socks: 'גרביים',
    pants: 'מכנסיים / ג׳ינס', pajamas: 'פיג׳מה', swimwear: 'בגד ים',
    sweater: 'סוודר / קפוצ׳ון', jacket: 'מעיל חם', 'rain-jacket': 'מעיל גשם',
    sneakers: 'נעלי ספורט', sandals: 'סנדלים / כפכפים', 'dress-shoes': 'נעליים אלגנטיות',
    toothbrush: 'מברשת שיניים', toothpaste: 'משחת שיניים',
    soap: 'סבון / ג׳ל רחצה', shampoo: 'שמפו ומרכך',
    deodorant: 'דאודורנט', sunscreen: 'קרם הגנה', chapstick: 'שפתון לחות',
    shaving: 'ערכת גילוח', makeup: 'איפור והיגיינה',
    medications: 'תרופות', 'first-aid': 'ערכת עזרה ראשונה',
    'travel-pillow': 'כרית צוואר', 'sleep-mask': 'מסכת שינה ואטמי אוזניים',
    'water-bottle': 'בקבוק מים רב-פעמי', book: 'ספר / קורא אלקטרוני',
    sunglasses: 'משקפי שמש', 'day-backpack': 'תרמיל יום מתקפל',
    umbrella: 'מטרייה קומפקטית',
    'ski-gloves': 'כפפות סקי', 'ski-goggles': 'משקפי סקי', beanie: 'כובע צמר',
    'hiking-boots': 'נעלי הליכה', 'beach-towel': 'מגבת חוף', necktie: 'עניבה',
    'power-bank': 'סוללת גיבוי', shorts: 'מכנסיים קצרים',
    'dress-shirt': 'חולצה מכופתרת', blazer: 'בלייזר / ז׳קט',
    'hand-sanitizer': 'ג׳ל חיטוי לידיים', 'period-care': 'מוצרי היגיינה נשית',
    'insect-repellent': 'דוחה יתושים',
  },
  pack: {
    label: 'התקדמות האריזה',
    progress: (n, total) => `${n} / ${total} ארוזים`,
    allPacked: 'הכול ארוז — אפשר לצאת לדרך!',
    clear: 'ניקוי הסימונים',
    checkAria: (name) => `סימון ${name} כארוז`,
  },
  share: { button: 'שיתוף הטיול', copied: 'הקישור הועתק!' },
  print: 'הדפסה / PDF',
  footer: 'PackMate · לארוז קל, להגיע רחוק.',
  language: 'שפה',
}

const TRANSLATIONS: Record<Lang, Translations> = { en: T_EN, ru: T_RU, bg: T_BG, he: T_HE }

/* ============================================================ LANG DETECTION ============================================================ */

const RUSSIAN_COUNTRIES = new Set(['ru', 'by', 'kz', 'kg', 'tj', 'tm', 'uz', 'az', 'am', 'ge', 'md', 'ua', 'ee', 'lv', 'lt'])
const BG_TIMEZONES = new Set(['Europe/Sofia', 'Europe/Skopje'])
const HE_TIMEZONES = new Set(['Asia/Jerusalem', 'Asia/Tel_Aviv'])
const RU_TIMEZONES = new Set([
  // Russia
  'Europe/Moscow', 'Europe/Kaliningrad', 'Europe/Samara', 'Europe/Volgograd',
  'Europe/Astrakhan', 'Europe/Saratov', 'Europe/Ulyanovsk', 'Europe/Kirov',
  'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Novokuznetsk',
  'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Chita', 'Asia/Yakutsk',
  'Asia/Vladivostok', 'Asia/Khandyga', 'Asia/Sakhalin', 'Asia/Ust-Nera',
  'Asia/Magadan', 'Asia/Srednekolymsk', 'Asia/Kamchatka', 'Asia/Anadyr',
  'Asia/Tomsk', 'Asia/Barnaul',
  // Other former-USSR (per user spec)
  'Europe/Minsk',
  'Europe/Kyiv', 'Europe/Uzhgorod', 'Europe/Zaporozhye', 'Europe/Simferopol',
  'Europe/Chisinau',
  'Europe/Tallinn', 'Europe/Riga', 'Europe/Vilnius',
  'Asia/Almaty', 'Asia/Aqtobe', 'Asia/Aqtau', 'Asia/Atyrau', 'Asia/Oral', 'Asia/Qostanay', 'Asia/Qyzylorda',
  'Asia/Bishkek', 'Asia/Dushanbe', 'Asia/Ashgabat',
  'Asia/Tashkent', 'Asia/Samarkand',
  'Asia/Baku', 'Asia/Yerevan', 'Asia/Tbilisi',
])

function guessLanguage(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = localStorage.getItem('packmate.lang')
    if (stored === 'en' || stored === 'ru' || stored === 'bg' || stored === 'he') return stored
  } catch { /* ignore */ }

  const langs =
    typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en']

  for (const lang of langs) {
    const tag = lang.toLowerCase()
    // 'he' is the modern code, 'iw' the legacy one some browsers still emit.
    if (tag.startsWith('he') || tag.startsWith('iw')) return 'he'
    if (tag.startsWith('bg') || tag.startsWith('mk')) return 'bg'
    if (tag.startsWith('ru')) return 'ru'
    const country = tag.split('-')[1]
    if (country === 'il') return 'he'
    if (country === 'bg' || country === 'mk') return 'bg'
    if (country && RUSSIAN_COUNTRIES.has(country)) return 'ru'
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (HE_TIMEZONES.has(tz)) return 'he'
    if (BG_TIMEZONES.has(tz)) return 'bg'
    if (RU_TIMEZONES.has(tz)) return 'ru'
  } catch { /* ignore */ }

  return 'en'
}

/* ============================================================ PERSISTENCE ============================================================ */

const STATE_KEY = 'packmate.state.v2'
const SNAPSHOTS_KEY = 'packmate.snapshots.v2'
const LANG_KEY = 'packmate.lang'

const DEFAULT_STATE: AppState = {
  days: 7,
  gender: 'male',
  travelerType: 'prepared',
  travelType: 'city',
  overrides: {},
}

function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return {
      days: clamp(parsed?.days ?? 7, 1, 21),
      gender: parsed?.gender === 'female' ? 'female' : 'male',
      travelerType: ['lean', 'it', 'prepared'].includes(parsed?.travelerType) ? parsed.travelerType : 'prepared',
      travelType: ['city', 'summer', 'ski', 'hiking', 'business'].includes(parsed?.travelType) ? parsed.travelType : 'city',
      overrides: (parsed?.overrides && typeof parsed.overrides === 'object') ? parsed.overrides : {},
    }
  } catch {
    return DEFAULT_STATE
  }
}

function saveStateToStorage(state: AppState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch { /* quota or disabled */ }
}

function loadSnapshots(): Snapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSnapshotsToStorage(snaps: Snapshot[]) {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps))
  } catch { /* ignore */ }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function uid(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  )
}

// Clock read kept module-level (like uid) so it stays out of render.
function now(): number {
  return Date.now()
}

/* -------------------- packing progress (check-off) -------------------- */

const PACKED_KEY = 'packmate.packed.v1'

function loadPacked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PACKED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function savePackedToStorage(packed: Record<string, boolean>) {
  try {
    localStorage.setItem(PACKED_KEY, JSON.stringify(packed))
  } catch { /* ignore */ }
}

/* -------------------- shareable trip links -------------------- */

// Compact, URL-safe base64 encoding of a trip so it can travel in a query
// string and reproduce the exact setup on any device. Keys kept short.
function encodeTrip(state: AppState, lang: Lang): string {
  const payload = {
    v: 2, l: lang,
    d: state.days, g: state.gender,
    r: state.travelerType, t: state.travelType,
    o: state.overrides,
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeTrip(param: string): { state: AppState; lang?: Lang } | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const p = JSON.parse(new TextDecoder().decode(bytes))
    const lang: Lang | undefined =
      p?.l === 'en' || p?.l === 'ru' || p?.l === 'bg' || p?.l === 'he' ? p.l : undefined
    return {
      state: {
        days: clamp(Number(p?.d) || 7, 1, 21),
        gender: p?.g === 'female' ? 'female' : 'male',
        travelerType: ['lean', 'it', 'prepared'].includes(p?.r) ? p.r : 'prepared',
        travelType: ['city', 'summer', 'ski', 'hiking', 'business'].includes(p?.t) ? p.t : 'city',
        overrides: p?.o && typeof p.o === 'object' ? p.o : {},
      },
      lang,
    }
  } catch {
    return null
  }
}

// Read a shared trip from the URL (?t=...) once at startup, then strip the
// param so ordinary editing + local persistence resume afterwards.
function readUrlBoot(): { state: AppState; lang?: Lang } | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('t')
    if (!raw) return null
    const decoded = decodeTrip(raw)
    if (decoded) {
      params.delete('t')
      const qs = params.toString()
      window.history.replaceState(
        null, '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
      )
    }
    return decoded
  } catch {
    return null
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

const URL_BOOT = readUrlBoot()
const BOOT_STATE: AppState = URL_BOOT?.state ?? loadState()

/* ============================================================ COMPONENT ============================================================ */

function App() {
  const [lang, setLang] = useState<Lang>(() => URL_BOOT?.lang ?? guessLanguage())
  const [days, setDays] = useState<number>(() => BOOT_STATE.days)
  const [gender, setGender] = useState<Gender>(() => BOOT_STATE.gender)
  const [travelerType, setTravelerType] = useState<TravelerType>(() => BOOT_STATE.travelerType)
  const [travelType, setTravelType] = useState<TravelType>(() => BOOT_STATE.travelType)
  const [overrides, setOverrides] = useState<Record<string, number>>(() => BOOT_STATE.overrides)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots())
  const [snapshotName, setSnapshotName] = useState('')
  const [packed, setPacked] = useState<Record<string, boolean>>(() => loadPacked())
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const t = TRANSLATIONS[lang]

  // Persist UI state continuously.
  useEffect(() => {
    saveStateToStorage({ days, gender, travelerType, travelType, overrides })
  }, [days, gender, travelerType, travelType, overrides])

  // Persist packing progress (kept separate from trip config + snapshots).
  useEffect(() => {
    savePackedToStorage(packed)
  }, [packed])

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* ignore */ }
    document.documentElement.lang = lang
    document.documentElement.dir = dirOf(lang)
  }, [lang])

  const activeItems = useMemo(
    () => resolveItems(gender, travelerType, travelType),
    [gender, travelerType, travelType],
  )

  const defaultQty = (item: ResolvedItem) =>
    item.fixed ? 1 : Math.max(1, Math.ceil(item.basePerDay * days))

  const getQty = (item: ResolvedItem) =>
    overrides[item.id] ?? defaultQty(item)

  const setQty = (item: ResolvedItem, qty: number) =>
    setOverrides((prev) => ({ ...prev, [item.id]: Math.max(0, qty) }))

  const resetItem = (item: ResolvedItem) =>
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })

  const { totalWeight, totalVolume, totalItems } = useMemo(() => {
    let w = 0, v = 0, n = 0
    for (const it of activeItems) {
      const q = getQty(it)
      w += q * it.weightKg
      v += q * it.volumeL
      n += q
    }
    return { totalWeight: w, totalVolume: v, totalItems: n }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems, overrides, days])

  const luggage: Luggage = useMemo(() => {
    if (totalVolume <= 25) return { nameKey: 'backpack', emoji: '🎒', tier: 1 }
    if (totalVolume <= 45) return { nameKey: 'carryOn',  emoji: '🧳', tier: 2 }
    return                     { nameKey: 'suitcase', emoji: '🧰', tier: 3 }
  }, [totalVolume])

  const warnings: Warning[] = useMemo(() => {
    const w: Warning[] = []
    if (totalWeight > 20) w.push({ type: 'over', msg: t.warnings.overweight(totalWeight.toFixed(1)) })
    if (totalVolume > 60) w.push({ type: 'over', msg: t.warnings.overvolume(totalVolume.toFixed(1)) })
    for (const it of activeItems) {
      const def = defaultQty(it)
      const qty = getQty(it)
      const name = t.items[it.id] ?? it.id
      if (!it.fixed && def > 0 && qty > def * 2) w.push({ type: 'over', msg: t.warnings.overpacked(it.emoji, name, qty, def) })
      if (it.fixed && qty > 3) w.push({ type: 'over', msg: t.warnings.fixedOver(it.emoji, name, qty) })
      if (it.essential && qty === 0) w.push({ type: 'under', msg: t.warnings.essential0(it.emoji, name) })
      if (!it.fixed && def >= 2 && qty > 0 && qty < Math.ceil(def / 2))
        w.push({ type: 'under', msg: t.warnings.lowScaling(it.emoji, name, qty, days, def) })
    }
    return w
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems, overrides, days, totalWeight, totalVolume, lang])

  const volumePct = Math.min(100, (totalVolume / 70) * 100)
  const weightPct = Math.min(100, (totalWeight / 25) * 100)

  const usedCategoriesCount = useMemo(
    () => CATEGORY_ORDER.filter((c) => activeItems.some((i) => i.category === c)).length,
    [activeItems],
  )

  // Packing progress counts only items you are actually bringing (qty > 0).
  const { packedCount, packableCount } = useMemo(() => {
    let packableCount = 0
    let packedCount = 0
    for (const it of activeItems) {
      if (getQty(it) <= 0) continue
      packableCount++
      if (packed[it.id]) packedCount++
    }
    return { packedCount, packableCount }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems, overrides, days, packed])

  const packPct = packableCount ? (packedCount / packableCount) * 100 : 0

  // Position a point (fill edge or tick label) so it lands under the slider
  // thumb's centre: the thumb centre travels from thumb/2 to (width − thumb/2),
  // so a plain percentage of the full track would drift off by up to half a thumb.
  const rangePos = (v: number) =>
    `calc(${(v - 1) / 20} * (100% - var(--pm-thumb)) + var(--pm-thumb) / 2)`
  const daysFillStop = rangePos(days)

  // The trip-length slider is full-width on phones, so a finger put down to
  // scroll the page usually lands on it — and a touch on a range input seeks
  // the thumb to that spot before the browser knows the gesture is a scroll.
  // `touch-action: pan-y` lets the page scroll; this puts the day count back
  // once the gesture proves to be vertical. Pointer-down runs before the seek,
  // so it is where the pre-gesture value is safe to capture.
  const rangeGesture = useRef<{ x: number; y: number; days: number; scrolling: boolean } | null>(null)

  const onRangePointerDown = (e: ReactPointerEvent<HTMLInputElement>) => {
    if (e.pointerType !== 'touch') return
    rangeGesture.current = { x: e.clientX, y: e.clientY, days, scrolling: false }
  }

  const onRangeTouchMove = (e: ReactTouchEvent<HTMLInputElement>) => {
    const g = rangeGesture.current
    if (!g || g.scrolling || e.touches.length !== 1) return
    const dx = Math.abs(e.touches[0].clientX - g.x)
    const dy = Math.abs(e.touches[0].clientY - g.y)
    if (dy > 8 && dy > dx) {
      g.scrolling = true
      setDays(g.days)
    }
  }

  const onRangeTouchEnd = () => {
    rangeGesture.current = null
  }

  const togglePacked = (id: string) =>
    setPacked((prev) => ({ ...prev, [id]: !prev[id] }))

  const clearPacked = () => setPacked({})

  async function shareTrip() {
    const url =
      `${window.location.origin}${window.location.pathname}` +
      `?t=${encodeTrip({ days, gender, travelerType, travelType, overrides }, lang)}`
    if (await copyText(url)) {
      setShareStatus('copied')
      window.setTimeout(() => setShareStatus('idle'), 2000)
    }
  }

  const printList = () => window.print()

  /* -------------------- snapshot handlers -------------------- */

  function saveSnapshot() {
    const name = snapshotName.trim() || autoSnapshotName()
    const snap: Snapshot = {
      id: uid(),
      name,
      savedAt: now(),
      state: { days, gender, travelerType, travelType, overrides },
    }
    const next = [snap, ...snapshots].slice(0, 20)
    setSnapshots(next)
    saveSnapshotsToStorage(next)
    setSnapshotName('')
  }

  function autoSnapshotName(): string {
    const tt = t.travelTypes[travelType].name
    const tr = t.travelers[travelerType].name
    return `${tt} · ${tr} · ${days}${DAY_SUFFIX[lang]}`
  }

  function loadSnapshot(snap: Snapshot) {
    setDays(snap.state.days)
    setGender(snap.state.gender)
    setTravelerType(snap.state.travelerType)
    setTravelType(snap.state.travelType)
    setOverrides(snap.state.overrides)
  }

  function deleteSnapshot(id: string) {
    if (typeof window !== 'undefined' && !confirm(t.snapshots.confirmDelete)) return
    const next = snapshots.filter((s) => s.id !== id)
    setSnapshots(next)
    saveSnapshotsToStorage(next)
  }

  /* -------------------- render -------------------- */

  return (
    <>
      <style>{packmateCss}</style>
      <main className="pm-app" dir={dirOf(lang)}>
        <div className="pm-hero-bg" aria-hidden />

        <div className="pm-print-head" aria-hidden>
          <strong>PackMate</strong> — {t.travelTypes[travelType].emoji} {t.travelTypes[travelType].name}
          {' · '}{t.travelers[travelerType].emoji} {t.travelers[travelerType].name}
          {' · '}{days} {days === 1 ? t.controls.day : t.controls.days}
          {' · '}{totalItems} {t.kpi.items}
          {' · '}{totalWeight.toFixed(1)} {t.units.kg} · {totalVolume.toFixed(1)} {t.units.l}
        </div>

        <header className="pm-hero">
          <div className="pm-hero-left">
            <LogoMark size={92} />
            <div>
              <h1 className="pm-title">
                <span className="pm-title-grad">PackMate</span>
              </h1>
              <p className="pm-tagline">{t.tagline}</p>
              <p className="pm-sub">{t.subtitle}</p>
            </div>
          </div>

          <div className="pm-hero-right">
            <LanguagePicker lang={lang} onChange={setLang} label={t.language} />
            <div className="pm-kpis">
              <Kpi label={t.kpi.items}  value={String(totalItems)} accent />
              <Kpi label={t.kpi.weight} value={`${totalWeight.toFixed(2)} ${t.units.kg}`} />
              <Kpi label={t.kpi.volume} value={`${totalVolume.toFixed(2)} ${t.units.l}`} />
            </div>
          </div>
        </header>

        {warnings.length > 0 && (
          <section className="pm-warnings" aria-live="polite">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`pm-alert pm-alert-${w.type}`}
                role="alert"
              >
                <span className="pm-alert-icon" aria-hidden>
                  {w.type === 'over' ? '⚠️' : '🚨'}
                </span>
                <span>{w.msg}</span>
              </div>
            ))}
          </section>
        )}

        <section className="pm-controls" aria-label="Trip settings">
          <div className="pm-control pm-control-span-2">
            <div className="pm-control-head">
              <label htmlFor="days" className="pm-label">{t.controls.tripLength}</label>
              <span className="pm-pill">{days} {days === 1 ? t.controls.day : t.controls.days}</span>
            </div>
            <input
              id="days"
              type="range"
              min={1}
              max={21}
              step={1}
              value={days}
              onChange={(e) => {
                // Mid-scroll seeks are discarded; React restores the DOM value.
                if (rangeGesture.current?.scrolling) return
                setDays(Number(e.target.value))
              }}
              onPointerDown={onRangePointerDown}
              onTouchMove={onRangeTouchMove}
              onTouchEnd={onRangeTouchEnd}
              onTouchCancel={onRangeTouchEnd}
              className="pm-range"
              style={{
                background: `linear-gradient(to right, var(--pm-accent) 0%, var(--pm-accent-2) ${daysFillStop}, var(--pm-track) ${daysFillStop}, var(--pm-track) 100%)`,
              }}
            />
            <div className="pm-range-scale" aria-hidden>
              {[1, 7, 14, 21].map((mark) => (
                <span key={mark} className="pm-range-mark" style={{ left: rangePos(mark) }}>
                  {mark}
                </span>
              ))}
            </div>
          </div>

          <div className="pm-control">
            <div className="pm-control-head">
              <span className="pm-label">{t.controls.gender}</span>
              <span className="pm-pill pm-pill-muted">{t.controls.genderHint}</span>
            </div>
            <div className="pm-segmented">
              <button
                aria-pressed={gender === 'male'}
                className={`pm-seg ${gender === 'male' ? 'pm-seg-active' : ''}`}
                onClick={() => setGender('male')}
                type="button"
              >
                <span aria-hidden>👨</span> {t.controls.male}
              </button>
              <button
                aria-pressed={gender === 'female'}
                className={`pm-seg ${gender === 'female' ? 'pm-seg-active' : ''}`}
                onClick={() => setGender('female')}
                type="button"
              >
                <span aria-hidden>👩</span> {t.controls.female}
              </button>
            </div>
          </div>

          <div className="pm-control">
            <div className="pm-control-head">
              <span className="pm-label">{t.controls.traveler}</span>
              <span className="pm-pill pm-pill-muted">{t.controls.travelerHint}</span>
            </div>
            <div className="pm-tiles">
              {(['lean', 'it', 'prepared'] as TravelerType[]).map((tt) => {
                const info = t.travelers[tt]
                const active = travelerType === tt
                return (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setTravelerType(tt)}
                    className={`pm-tile ${active ? 'pm-tile-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span className="pm-tile-emoji" aria-hidden>{info.emoji}</span>
                    <span className="pm-tile-name">{info.name}</span>
                    <span className="pm-tile-tag">{info.tagline}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pm-control pm-control-span-2">
            <div className="pm-control-head">
              <span className="pm-label">{t.controls.travelType}</span>
              <span className="pm-pill pm-pill-muted">{t.controls.travelTypeHint}</span>
            </div>
            <div className="pm-chips">
              {(['city', 'summer', 'ski', 'hiking', 'business'] as TravelType[]).map((tt) => {
                const info = t.travelTypes[tt]
                const active = travelType === tt
                return (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setTravelType(tt)}
                    className={`pm-chip ${active ? 'pm-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span aria-hidden>{info.emoji}</span> {info.name}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="pm-grid">
          <div className="pm-items" aria-label={t.list.title}>
            <div className="pm-items-head">
              <div className="pm-items-head-main">
                <h2 className="pm-h2">{t.list.title}</h2>
                <span className="pm-muted">
                  {t.list.breakdown(activeItems.length, usedCategoriesCount, days)}
                </span>
              </div>
              <div className="pm-item-tools">
                <button
                  type="button"
                  className="pm-btn pm-btn-sm pm-tool-btn"
                  onClick={shareTrip}
                >
                  {shareStatus === 'copied' ? `✅ ${t.share.copied}` : `🔗 ${t.share.button}`}
                </button>
                <button
                  type="button"
                  className="pm-btn pm-btn-sm pm-tool-btn"
                  onClick={printList}
                >
                  🖨️ {t.print}
                </button>
              </div>
            </div>

            {packableCount > 0 && (
              <div className="pm-progress">
                <div className="pm-progress-head">
                  <span className="pm-progress-label">
                    {packedCount >= packableCount
                      ? `🎉 ${t.pack.allPacked}`
                      : t.pack.progress(packedCount, packableCount)}
                  </span>
                  {packedCount > 0 && (
                    <button
                      type="button"
                      className="pm-btn pm-btn-link pm-progress-clear"
                      onClick={clearPacked}
                    >
                      {t.pack.clear}
                    </button>
                  )}
                </div>
                <div
                  className="pm-progress-track"
                  role="progressbar"
                  aria-label={t.pack.label}
                  aria-valuenow={packedCount}
                  aria-valuemin={0}
                  aria-valuemax={packableCount}
                >
                  <div className="pm-progress-fill" style={{ width: `${packPct}%` }} />
                </div>
              </div>
            )}

            {CATEGORY_ORDER.map((cat) => {
              const itemsInCat = activeItems.filter((it) => it.category === cat)
              if (itemsInCat.length === 0) return null
              const catQty = itemsInCat.reduce((sum, it) => sum + getQty(it), 0)
              const catWeight = itemsInCat.reduce((sum, it) => sum + getQty(it) * it.weightKg, 0)
              return (
                <div key={cat} className="pm-cat">
                  <div className="pm-cat-head">
                    <span className="pm-cat-emoji" aria-hidden>{CATEGORY_EMOJI[cat]}</span>
                    <h3 className="pm-cat-name">{t.categories[cat]}</h3>
                    <span className="pm-cat-meta">
                      {t.list.pieces(catQty)} · {catWeight.toFixed(2)} {t.units.kg}
                    </span>
                  </div>
                  <ul className="pm-list">
                    {itemsInCat.map((it) => {
                      const def = defaultQty(it)
                      const qty = getQty(it)
                      const overridden = overrides[it.id] !== undefined
                      const overPacked = !it.fixed && def > 0 && qty > def * 2
                      const fixedOverpacked = it.fixed && qty > 3
                      const essentialMissing = !!it.essential && qty === 0
                      const lowOnScaling =
                        !it.fixed && def >= 2 && qty > 0 && qty < Math.ceil(def / 2)
                      const itemName = t.items[it.id] ?? it.id
                      const isPacked = !!packed[it.id]
                      const isZero = qty === 0
                      return (
                        <li
                          key={it.id}
                          className={[
                            'pm-item',
                            isZero ? 'pm-item-zero' : '',
                            !isZero && isPacked ? 'pm-item-packed' : '',
                            !isZero && (overPacked || fixedOverpacked) ? 'pm-item-warn' : '',
                            !isZero && lowOnScaling ? 'pm-item-low' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {isZero ? (
                            <span
                              className={`pm-check-x ${essentialMissing ? 'pm-check-x-danger' : ''}`}
                              aria-hidden
                            >
                              ✕
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              className="pm-check"
                              checked={isPacked}
                              onChange={() => togglePacked(it.id)}
                              aria-label={t.pack.checkAria(itemName)}
                            />
                          )}
                          <div className="pm-item-emoji" aria-hidden>{it.emoji}</div>

                          <div className="pm-item-info">
                            <div className="pm-item-name">
                              {itemName}
                              {it.essential && (
                                <span className="pm-tag pm-tag-essential">{t.list.essential}</span>
                              )}
                              {it.gender && (
                                <span className="pm-tag pm-tag-gender">
                                  {it.gender === 'male' ? t.list.genderTag.male : t.list.genderTag.female}
                                </span>
                              )}
                            </div>
                            <div className="pm-item-meta">
                              {it.fixed ? (
                                <>{t.list.fixedItem}{' · '}{t.list.suggested}{' '}<b>1</b></>
                              ) : (
                                <>
                                  {it.basePerDay === 1
                                    ? `1${t.list.perDay}`
                                    : `${it.basePerDay}${t.list.perDay}`}
                                  {' · '}{t.list.suggested}{' '}<b>{def}</b>
                                </>
                              )}
                              <span className="pm-dot">•</span>
                              {(qty * it.weightKg).toFixed(2)} {t.units.kg}
                              <span className="pm-dot">•</span>
                              {(qty * it.volumeL).toFixed(2)} {t.units.l}
                            </div>
                          </div>

                          <div className="pm-qty">
                            <button
                              type="button"
                              className="pm-btn pm-btn-round"
                              onClick={() => setQty(it, qty - 1)}
                              disabled={qty <= 0}
                              aria-label={`− ${itemName}`}
                            >
                              −
                            </button>
                            <span className="pm-qty-val" aria-live="polite">{qty}</span>
                            <button
                              type="button"
                              className="pm-btn pm-btn-round"
                              onClick={() => setQty(it, qty + 1)}
                              aria-label={`+ ${itemName}`}
                            >
                              +
                            </button>
                            {overridden && (
                              <button
                                type="button"
                                className="pm-btn pm-btn-link"
                                onClick={() => resetItem(it)}
                                aria-label={`reset ${itemName}`}
                                title={`reset ${itemName}`}
                              >
                                ↺
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>

          <aside className="pm-summary" aria-label="Trip summary">
            <div className="pm-card pm-card-glow">
              <h2 className="pm-h2">{t.telemetry.title}</h2>

              <Gauge
                label={t.telemetry.volume}
                value={`${totalVolume.toFixed(2)} ${t.units.l}`}
                pct={volumePct}
                color="var(--pm-accent)"
                ticks={[
                  { at: (25 / 70) * 100, label: '25L' },
                  { at: (45 / 70) * 100, label: '45L' },
                ]}
              />
              <Gauge
                label={t.telemetry.weight}
                value={`${totalWeight.toFixed(2)} ${t.units.kg}`}
                pct={weightPct}
                color={totalWeight > 20 ? 'var(--pm-danger)' : 'var(--pm-success)'}
                ticks={[{ at: (20 / 25) * 100, label: '20kg' }]}
              />
            </div>

            <div className={`pm-card pm-luggage pm-luggage-${luggage.tier}`}>
              <div className="pm-luggage-head">
                <span className="pm-muted pm-uppercase">{t.luggage.title}</span>
                <span className="pm-pill pm-pill-muted">{t.luggage.tier(luggage.tier)}</span>
              </div>
              <div className="pm-luggage-body">
                <div className="pm-luggage-emoji" aria-hidden>{luggage.emoji}</div>
                <div>
                  <div className="pm-luggage-name">{t.luggage[luggage.nameKey]}</div>
                  <div className="pm-muted">
                    {luggage.tier === 1 && t.luggage.capacityUpTo(25)}
                    {luggage.tier === 2 && t.luggage.capacityBetween(25, 45)}
                    {luggage.tier === 3 && t.luggage.capacityOver(45)}
                  </div>
                </div>
              </div>
              <div className="pm-luggage-bar" aria-hidden>
                <div className={`pm-luggage-seg ${luggage.tier >= 1 ? 'on' : ''}`}>{t.luggage.barBackpack}</div>
                <div className={`pm-luggage-seg ${luggage.tier >= 2 ? 'on' : ''}`}>{t.luggage.barCarryOn}</div>
                <div className={`pm-luggage-seg ${luggage.tier >= 3 ? 'on' : ''}`}>{t.luggage.barSuitcase}</div>
              </div>
            </div>

            <div className="pm-card">
              <div className="pm-snapshots-head">
                <h2 className="pm-h2">{t.snapshots.title}</h2>
                <span className="pm-muted pm-tiny">💾 {t.snapshots.autoSaved}</span>
              </div>
              <div className="pm-snapshot-form">
                <input
                  type="text"
                  className="pm-input"
                  placeholder={t.snapshots.placeholder}
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveSnapshot() }}
                  maxLength={48}
                />
                <button
                  type="button"
                  className="pm-btn pm-btn-primary"
                  onClick={saveSnapshot}
                >
                  💾 {t.snapshots.save}
                </button>
              </div>

              {snapshots.length === 0 ? (
                <p className="pm-muted pm-empty">{t.snapshots.empty}</p>
              ) : (
                <ul className="pm-snapshot-list">
                  {snapshots.map((s) => (
                    <li key={s.id} className="pm-snapshot">
                      <div className="pm-snapshot-info">
                        <div className="pm-snapshot-name">{s.name}</div>
                        <div className="pm-muted pm-tiny">
                          {t.travelTypes[s.state.travelType].emoji} {t.travelTypes[s.state.travelType].name}
                          {' · '}{t.travelers[s.state.travelerType].emoji} {t.travelers[s.state.travelerType].name}
                          {' · '}{s.state.days}{DAY_SUFFIX[lang]}
                        </div>
                      </div>
                      <div className="pm-snapshot-actions">
                        <button
                          type="button"
                          className="pm-btn pm-btn-sm"
                          onClick={() => loadSnapshot(s)}
                          title={t.snapshots.load}
                        >
                          ↥ {t.snapshots.load}
                        </button>
                        <button
                          type="button"
                          className="pm-btn pm-btn-sm pm-btn-danger"
                          onClick={() => deleteSnapshot(s.id)}
                          title={t.snapshots.delete}
                          aria-label={t.snapshots.delete}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>

        <footer className="pm-footer">
          <span className="pm-muted">{t.footer}</span>
        </footer>
      </main>
    </>
  )
}

/* ============================================================ SUB-COMPONENTS ============================================================ */

function LogoMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className="pm-logo-svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="pm-logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--pm-accent)" />
          <stop offset="1" stopColor="var(--pm-accent-2)" />
        </linearGradient>
        <linearGradient id="pm-logo-body" x1="12" y1="18" x2="52" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#pm-logo-bg)" />
      <path d="M24 18 v-4 a4 4 0 0 1 4 -4 h8 a4 4 0 0 1 4 4 v4" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="12" y="18" width="40" height="32" rx="5" fill="url(#pm-logo-body)" />
      <rect x="29" y="18" width="6" height="32" fill="var(--pm-accent-strong)" opacity="0.18" />
      <rect x="27" y="30" width="10" height="6" rx="1.5" fill="var(--pm-accent-strong)" />
      <rect x="30" y="32" width="4" height="2" rx="0.5" fill="#ffffff" />
      <circle cx="17" cy="23" r="1.2" fill="#cbd5e1" />
      <circle cx="47" cy="23" r="1.2" fill="#cbd5e1" />
      <circle cx="17" cy="45" r="1.2" fill="#cbd5e1" />
      <circle cx="47" cy="45" r="1.2" fill="#cbd5e1" />
    </svg>
  )
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`pm-kpi ${accent ? 'pm-kpi-accent' : ''}`}>
      <div className="pm-kpi-value">{value}</div>
      <div className="pm-kpi-label">{label}</div>
    </div>
  )
}

interface GaugeProps {
  label: string
  value: string
  pct: number
  color: string
  ticks?: { at: number; label: string }[]
}

function Gauge({ label, value, pct, color, ticks = [] }: GaugeProps) {
  const barStyle: CSSProperties = { width: `${pct}%`, background: color }
  return (
    <div className="pm-gauge">
      <div className="pm-gauge-head">
        <span className="pm-muted">{label}</span>
        <span className="pm-gauge-value" style={{ color }}>{value}</span>
      </div>
      <div className="pm-gauge-track">
        <div className="pm-gauge-fill" style={barStyle} />
        {ticks.map((tk, i) => (
          <span key={i} className="pm-gauge-tick" style={{ left: `${tk.at}%` }}>
            <span className="pm-gauge-tick-label">{tk.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function LanguagePicker({
  lang,
  onChange,
  label,
}: {
  lang: Lang
  onChange: (l: Lang) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGS.find((l) => l.code === lang) || LANGS[0]

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`pm-lang ${open ? 'pm-lang-open' : ''}`}>
      <button
        type="button"
        className="pm-lang-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="pm-lang-flag" aria-hidden>{current.flag}</span>
        <span className="pm-lang-name">{current.name}</span>
        <span className="pm-lang-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="pm-lang-menu" role="listbox">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                className={`pm-lang-item ${l.code === lang ? 'pm-lang-item-active' : ''}`}
                onClick={() => { onChange(l.code); setOpen(false) }}
              >
                <span className="pm-lang-flag" aria-hidden>{l.flag}</span>
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ============================================================ STYLES ============================================================ */

const packmateCss = `
.pm-app {
  --pm-accent: #6366f1;
  --pm-accent-2: #ec4899;
  --pm-accent-strong: #4f46e5;
  --pm-accent-bg: rgba(99, 102, 241, 0.10);
  --pm-text: #0a0a18;
  --pm-text-soft: #334155;
  --pm-muted: #64748b;
  --pm-card: #ffffff;
  --pm-card-soft: rgba(255, 255, 255, 0.7);
  --pm-bg: #f6f7fb;
  --pm-border: #e2e8f0;
  --pm-border-strong: #cbd5e1;
  --pm-track: #e2e8f0;
  --pm-thumb: 24px;
  --pm-danger: #dc2626;
  --pm-danger-bg: #fee2e2;
  --pm-warn: #d97706;
  --pm-warn-bg: #fef3c7;
  --pm-success: #16a34a;
  --pm-shadow-sm: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04);
  --pm-shadow:    0 4px 12px -2px rgba(15,23,42,.08), 0 2px 6px -2px rgba(15,23,42,.05);
  --pm-shadow-lg: 0 24px 48px -16px rgba(79, 70, 229, .25), 0 8px 16px -4px rgba(15,23,42,.06);
  --pm-shadow-accent: 0 8px 24px -8px rgba(99,102,241,.35);

  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 28px 56px;
  text-align: start;
  color: var(--pm-text);
  font: 15px/1.55 -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -0.005em;
  isolation: isolate;
}
.pm-app *, .pm-app *::before, .pm-app *::after { box-sizing: border-box; }

@media (prefers-color-scheme: dark) {
  .pm-app {
    --pm-accent: #818cf8;
    --pm-accent-2: #f472b6;
    --pm-accent-strong: #a5b4fc;
    --pm-accent-bg: rgba(129, 140, 248, 0.15);
    --pm-text: #f8fafc;
    --pm-text-soft: #cbd5e1;
    --pm-muted: #94a3b8;
    --pm-card: #14141d;
    --pm-card-soft: rgba(24, 24, 35, 0.7);
    --pm-bg: #0a0a14;
    --pm-border: #2a2a3a;
    --pm-border-strong: #3a3a52;
    --pm-track: #25253a;
    --pm-danger: #f87171;
    --pm-danger-bg: rgba(248,113,113,.12);
    --pm-warn: #fbbf24;
    --pm-warn-bg: rgba(251,191,36,.12);
    --pm-success: #4ade80;
    --pm-shadow-sm: 0 1px 3px rgba(0,0,0,.4);
    --pm-shadow:    0 6px 16px -4px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.3);
    --pm-shadow-lg: 0 24px 56px -16px rgba(99,102,241,.45), 0 8px 16px -4px rgba(0,0,0,.4);
    --pm-shadow-accent: 0 12px 32px -8px rgba(129,140,248,.45);
  }
}

/* ========== animated background mesh ========== */
.pm-hero-bg {
  position: absolute;
  inset: -40px -40px auto -40px;
  height: 460px;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(60% 80% at 12% 12%, rgba(99,102,241,.35) 0%, transparent 60%),
    radial-gradient(50% 60% at 88% 18%, rgba(236,72,153,.30) 0%, transparent 60%),
    radial-gradient(40% 50% at 50% 80%, rgba(168,85,247,.22) 0%, transparent 70%);
  filter: blur(8px) saturate(1.1);
  opacity: .9;
}
@media (prefers-color-scheme: dark) {
  .pm-hero-bg {
    background:
      radial-gradient(60% 80% at 12% 12%, rgba(129,140,248,.40) 0%, transparent 60%),
      radial-gradient(50% 60% at 88% 18%, rgba(244,114,182,.32) 0%, transparent 60%),
      radial-gradient(40% 50% at 50% 80%, rgba(168,85,247,.25) 0%, transparent 70%);
    opacity: .7;
  }
}

/* ========== hero ========== */
.pm-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
  margin-bottom: 28px;
}
.pm-hero-left { display: flex; align-items: center; gap: 22px; min-width: 0; }
.pm-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }

.pm-logo-svg {
  filter: drop-shadow(0 18px 32px rgba(99, 102, 241, .35));
  transition: transform .25s ease;
  flex-shrink: 0;
}
.pm-logo-svg:hover { transform: rotate(-3deg) scale(1.04); }
@media (prefers-color-scheme: dark) {
  .pm-logo-svg { filter: drop-shadow(0 18px 32px rgba(129, 140, 248, .55)); }
}

.pm-title {
  margin: 0;
  font-size: 56px;
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 800;
}
.pm-title-grad {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.pm-tagline {
  margin: 6px 0 2px;
  font-size: 18px;
  font-weight: 600;
  color: var(--pm-text);
  letter-spacing: -0.01em;
}
.pm-sub { color: var(--pm-muted); margin: 0; font-size: 14.5px; max-width: 52ch; }

/* ========== KPI ========== */
.pm-kpis { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.pm-kpi {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  padding: 12px 18px;
  min-width: 108px;
  text-align: end;
  box-shadow: var(--pm-shadow-sm);
  transition: transform .2s ease, box-shadow .2s ease;
}
.pm-kpi:hover { transform: translateY(-2px); box-shadow: var(--pm-shadow); }
.pm-kpi-value { font-size: 22px; font-weight: 700; color: var(--pm-text); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.pm-kpi-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pm-muted); margin-top: 2px; font-weight: 600; }
.pm-kpi-accent {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: var(--pm-shadow-accent);
}
.pm-kpi-accent .pm-kpi-value { color: #fff; }
.pm-kpi-accent .pm-kpi-label { color: rgba(255,255,255,.85); }

/* ========== language picker ========== */
.pm-lang { position: relative; }
.pm-lang-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--pm-card); color: var(--pm-text);
  border: 1px solid var(--pm-border); border-radius: 999px;
  padding: 7px 12px 7px 8px; font: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer; box-shadow: var(--pm-shadow-sm);
  transition: border-color .15s ease, transform .15s ease;
}
.pm-lang-btn:hover { border-color: var(--pm-accent); transform: translateY(-1px); }
.pm-lang-flag { font-size: 18px; line-height: 1; }
.pm-lang-name { letter-spacing: -0.01em; }
.pm-lang-caret { font-size: 10px; opacity: .6; transition: transform .2s ease; }
.pm-lang-open .pm-lang-caret { transform: rotate(180deg); }
.pm-lang-menu {
  position: absolute; inset-inline-end: 0; top: calc(100% + 6px);
  background: var(--pm-card); border: 1px solid var(--pm-border);
  border-radius: 12px; padding: 6px; margin: 0; list-style: none;
  box-shadow: var(--pm-shadow-lg);
  min-width: 180px; z-index: 20;
}
.pm-lang-item {
  width: 100%; display: flex; align-items: center; gap: 10px;
  background: transparent; border: 0; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; font: inherit; font-size: 14px;
  color: var(--pm-text); text-align: start;
}
.pm-lang-item:hover { background: var(--pm-accent-bg); }
.pm-lang-item-active { background: var(--pm-accent-bg); color: var(--pm-accent-strong); font-weight: 600; }

/* ========== warnings ========== */
.pm-warnings { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
.pm-alert {
  display: flex; align-items: flex-start; gap: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 14px; font-weight: 500;
  background: var(--pm-card);
  box-shadow: var(--pm-shadow-sm);
  animation: pm-pop .25s cubic-bezier(.34,1.56,.64,1);
}
.pm-alert-over   { background: var(--pm-warn-bg);   border-color: color-mix(in srgb, var(--pm-warn) 35%, transparent); }
.pm-alert-under  { background: var(--pm-danger-bg); border-color: color-mix(in srgb, var(--pm-danger) 45%, transparent); }
.pm-alert-icon { font-size: 18px; line-height: 1.2; }
@keyframes pm-pop {
  from { opacity: 0; transform: translateY(-6px) scale(.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}

/* ========== controls ========== */
.pm-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 24px;
}
.pm-control-span-2 { grid-column: 1 / -1; }
.pm-control {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 18px;
  padding: 18px 20px;
  box-shadow: var(--pm-shadow);
}
.pm-control-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; gap: 12px;
}
.pm-label { font-weight: 700; color: var(--pm-text); font-size: 15px; letter-spacing: -0.01em; }
.pm-pill {
  background: var(--pm-accent-bg);
  color: var(--pm-accent-strong);
  font-weight: 700; font-size: 12.5px;
  padding: 4px 11px; border-radius: 999px;
  font-variant-numeric: tabular-nums; letter-spacing: 0;
}
.pm-pill-muted {
  background: transparent; color: var(--pm-muted);
  border: 1px solid var(--pm-border); font-weight: 500;
}

/* range */
.pm-range {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 8px; border-radius: 999px;
  outline: none; cursor: pointer;
  direction: ltr; /* keep the 1→21 scale + fill LTR even on RTL pages */
  /* The slider spans the full width on phones. Without this, a touch that
     starts on it is claimed by the thumb drag and the page won't scroll —
     pan-y hands vertical drags back to the browser while horizontal ones
     still move the thumb. */
  touch-action: pan-y;
}
.pm-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  box-sizing: border-box;
  width: var(--pm-thumb); height: var(--pm-thumb); border-radius: 50%;
  background: var(--pm-card); border: 3px solid var(--pm-accent);
  box-shadow: 0 4px 10px rgba(99,102,241,.45), 0 0 0 6px rgba(99,102,241,.0);
  cursor: grab; transition: transform .15s ease, box-shadow .15s ease;
}
.pm-range::-webkit-slider-thumb:hover { box-shadow: 0 4px 12px rgba(99,102,241,.55), 0 0 0 6px rgba(99,102,241,.15); }
.pm-range::-webkit-slider-thumb:active { transform: scale(1.18); cursor: grabbing; }
.pm-range::-moz-range-thumb {
  box-sizing: border-box;
  width: var(--pm-thumb); height: var(--pm-thumb); border-radius: 50%;
  background: var(--pm-card); border: 3px solid var(--pm-accent);
  box-shadow: 0 4px 10px rgba(99,102,241,.45); cursor: grab;
}
.pm-range-scale {
  position: relative; height: 15px; direction: ltr;
  margin-top: 10px; color: var(--pm-muted); font-size: 12px;
  font-variant-numeric: tabular-nums; font-weight: 600;
}
.pm-range-mark {
  position: absolute; top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* segmented (gender) */
.pm-segmented {
  display: grid; grid-template-columns: 1fr 1fr;
  background: var(--pm-bg);
  border: 1px solid var(--pm-border);
  padding: 4px; border-radius: 12px; gap: 4px;
}
.pm-seg {
  border: 0; background: transparent;
  padding: 10px 12px; border-radius: 9px;
  font-weight: 600; color: var(--pm-muted);
  cursor: pointer; font-size: 14px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s ease, color .15s ease, box-shadow .15s ease;
}
.pm-seg:hover { color: var(--pm-text); }
.pm-seg-active {
  background: var(--pm-card); color: var(--pm-accent-strong);
  box-shadow: var(--pm-shadow-sm);
}

/* tiles (traveler) */
.pm-tiles { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.pm-tile {
  border: 1px solid var(--pm-border);
  background: var(--pm-bg);
  border-radius: 12px;
  padding: 12px 8px 10px;
  text-align: center;
  cursor: pointer;
  font: inherit;
  color: var(--pm-text);
  transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease, background .15s ease;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.pm-tile:hover { transform: translateY(-2px); border-color: var(--pm-accent); }
.pm-tile-emoji { font-size: 26px; line-height: 1; }
.pm-tile-name { font-weight: 700; font-size: 14px; }
.pm-tile-tag { font-size: 11px; color: var(--pm-muted); }
.pm-tile-active {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  border-color: transparent;
  color: #ffffff;
  box-shadow: var(--pm-shadow-accent);
  transform: translateY(-2px);
}
.pm-tile-active .pm-tile-tag { color: rgba(255,255,255,.88); }

/* chips (travel type) */
.pm-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pm-chip {
  border: 1px solid var(--pm-border);
  background: var(--pm-bg);
  color: var(--pm-text);
  padding: 9px 14px;
  border-radius: 999px;
  font: inherit;
  font-weight: 600; font-size: 13.5px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  transition: all .15s ease;
}
.pm-chip:hover { border-color: var(--pm-accent); transform: translateY(-1px); }
.pm-chip-active {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  border-color: transparent;
  color: #ffffff;
  box-shadow: var(--pm-shadow-accent);
}

/* ========== grid ========== */
.pm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

/* ========== items ========== */
.pm-items {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: var(--pm-shadow);
}
.pm-items-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 8px; gap: 8px; flex-wrap: wrap;
}
.pm-h2 { margin: 0; font-size: 19px; color: var(--pm-text); font-weight: 700; letter-spacing: -0.02em; }
.pm-muted { color: var(--pm-muted); font-size: 13px; }
.pm-tiny  { font-size: 11.5px; }
.pm-uppercase { text-transform: uppercase; letter-spacing: 0.09em; font-size: 11px; font-weight: 700; }

.pm-cat { margin-top: 20px; }
.pm-cat:first-of-type { margin-top: 6px; }
.pm-cat-head {
  display: flex; align-items: center; gap: 10px;
  padding: 0 4px 10px;
  border-bottom: 1px dashed var(--pm-border);
  margin-bottom: 10px;
}
.pm-cat-emoji {
  width: 30px; height: 30px;
  display: grid; place-items: center;
  font-size: 16px;
  background: var(--pm-accent-bg);
  border-radius: 9px;
}
.pm-cat-name {
  margin: 0; flex: 1;
  font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--pm-text);
}
.pm-cat-meta { font-size: 12px; color: var(--pm-muted); font-variant-numeric: tabular-nums; }

.pm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pm-item {
  display: grid;
  grid-template-columns: auto 50px 1fr auto;
  gap: 14px; align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  background: var(--pm-bg);
  transition: all .18s ease;
}
.pm-item:hover {
  border-color: color-mix(in srgb, var(--pm-accent) 40%, var(--pm-border));
  transform: translateY(-1px);
  box-shadow: var(--pm-shadow-sm);
}
.pm-item-warn   { border-color: color-mix(in srgb, var(--pm-warn) 50%, transparent); background: var(--pm-warn-bg); }
.pm-item-low    { border-color: color-mix(in srgb, var(--pm-warn) 35%, transparent); background: var(--pm-warn-bg); }
.pm-item-danger { border-color: color-mix(in srgb, var(--pm-danger) 50%, transparent); background: var(--pm-danger-bg); }

.pm-item-emoji {
  width: 50px; height: 50px;
  font-size: 28px;
  display: grid; place-items: center;
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  flex-shrink: 0;
  transition: transform .15s ease;
}
.pm-item:hover .pm-item-emoji { transform: scale(1.08) rotate(-3deg); }

.pm-item-info { min-width: 0; }
.pm-item-name {
  font-weight: 700; color: var(--pm-text);
  font-size: 15px; display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; letter-spacing: -0.01em;
}
.pm-item-meta {
  color: var(--pm-muted); font-size: 12.5px; margin-top: 3px;
  line-height: 1.45;
}
.pm-item-meta b { color: var(--pm-text); font-weight: 700; font-variant-numeric: tabular-nums; }
.pm-dot { margin: 0 8px; opacity: .5; }

.pm-tag {
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.pm-tag-essential { background: var(--pm-accent-bg); color: var(--pm-accent-strong); }
.pm-tag-gender { background: var(--pm-bg); color: var(--pm-muted); border: 1px solid var(--pm-border); }

.pm-qty { display: inline-flex; align-items: center; gap: 6px; }
.pm-qty-val {
  min-width: 30px; text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 800; font-size: 16px;
  color: var(--pm-text);
}
.pm-btn {
  border: 1px solid var(--pm-border);
  background: var(--pm-card);
  color: var(--pm-text);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  transition: background .15s ease, border-color .15s ease, color .15s ease, transform .08s ease, box-shadow .15s ease;
}
.pm-btn:hover:not(:disabled) {
  border-color: var(--pm-accent);
  color: var(--pm-accent-strong);
  box-shadow: var(--pm-shadow-sm);
}
.pm-btn:active:not(:disabled) { transform: scale(.95); }
.pm-btn:disabled { opacity: .35; cursor: not-allowed; }
.pm-btn-round {
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 20px; line-height: 1;
  display: grid; place-items: center;
}
.pm-btn-link {
  border: 0; background: transparent; padding: 4px 6px;
  color: var(--pm-muted); font-size: 16px;
}
.pm-btn-link:hover:not(:disabled) { background: var(--pm-accent-bg); border-radius: 8px; }
.pm-btn-sm { padding: 6px 10px; border-radius: 8px; font-size: 12.5px; }
.pm-btn-primary {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  color: #ffffff; border-color: transparent;
  box-shadow: var(--pm-shadow-accent);
}
.pm-btn-primary:hover:not(:disabled) { color: #ffffff; box-shadow: 0 12px 28px -8px rgba(99,102,241,.55); transform: translateY(-1px); }
.pm-btn-danger { color: var(--pm-danger); }
.pm-btn-danger:hover:not(:disabled) { color: #ffffff; background: var(--pm-danger); border-color: var(--pm-danger); }

/* ========== summary side ========== */
.pm-summary {
  display: flex; flex-direction: column; gap: 16px;
  position: sticky; top: 16px;
}
.pm-card {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: var(--pm-shadow);
}
.pm-card-glow {
  background:
    radial-gradient(80% 100% at 0% 0%, var(--pm-accent-bg) 0%, transparent 50%),
    var(--pm-card);
}

/* gauge */
.pm-gauge { margin-top: 14px; }
.pm-gauge:first-of-type { margin-top: 18px; }
.pm-gauge-head { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.pm-gauge-value { font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.pm-gauge-track {
  position: relative; height: 10px; direction: ltr;
  background: var(--pm-track);
  border-radius: 999px; overflow: visible;
}
.pm-gauge-fill {
  height: 100%; border-radius: 999px;
  transition: width .45s cubic-bezier(.4,0,.2,1), background .25s ease;
  background-image: linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.4), rgba(255,255,255,.0));
  background-blend-mode: overlay;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.15);
}
.pm-gauge-tick {
  position: absolute; top: -3px; height: 16px; width: 2px;
  background: var(--pm-text); opacity: .35; border-radius: 2px;
}
.pm-gauge-tick-label {
  position: absolute; top: 18px; left: 50%;
  transform: translateX(-50%);
  font-size: 10px; color: var(--pm-muted);
  white-space: nowrap; font-weight: 600;
}

/* luggage */
.pm-luggage-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.pm-luggage-body { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.pm-luggage-emoji {
  width: 64px; height: 64px;
  font-size: 36px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  border-radius: 16px;
  box-shadow: var(--pm-shadow-accent);
  flex-shrink: 0;
}
.pm-luggage-name { font-size: 20px; font-weight: 800; color: var(--pm-text); letter-spacing: -0.02em; }
.pm-luggage-bar {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  background: var(--pm-bg); border: 1px solid var(--pm-border);
  border-radius: 10px; overflow: hidden;
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.pm-luggage-seg {
  padding: 9px 4px; text-align: center;
  color: var(--pm-muted);
  border-inline-end: 1px solid var(--pm-border);
  transition: background .25s ease, color .25s ease;
}
.pm-luggage-seg:last-child { border-inline-end: 0; }
.pm-luggage-seg.on {
  background: linear-gradient(135deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  color: #ffffff;
}

/* snapshots */
.pm-snapshots-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.pm-snapshot-form { display: flex; gap: 6px; margin-bottom: 12px; }
.pm-input {
  flex: 1; min-width: 0;
  background: var(--pm-bg);
  border: 1px solid var(--pm-border);
  border-radius: 10px;
  padding: 9px 12px;
  font: inherit; font-size: 13.5px;
  color: var(--pm-text);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.pm-input::placeholder { color: var(--pm-muted); }
.pm-input:focus {
  outline: none; border-color: var(--pm-accent);
  box-shadow: 0 0 0 3px var(--pm-accent-bg);
}
.pm-empty { padding: 12px 0; text-align: center; }
.pm-snapshot-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; }
.pm-snapshot {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: 10px;
  background: var(--pm-bg);
  transition: border-color .15s ease, transform .15s ease;
}
.pm-snapshot:hover { border-color: var(--pm-accent); transform: translateX(2px); }
.pm-snapshot-info { min-width: 0; flex: 1; }
.pm-snapshot-name { font-weight: 700; font-size: 13.5px; color: var(--pm-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
.pm-snapshot-actions { display: inline-flex; gap: 4px; flex-shrink: 0; }

/* footer */
.pm-footer { margin-top: 36px; text-align: center; }

/* responsive */
@media (max-width: 960px) {
  .pm-grid { grid-template-columns: 1fr; }
  .pm-summary { position: static; }
}
@media (max-width: 720px) {
  .pm-app { padding: 20px 18px 40px; }
  .pm-hero { grid-template-columns: 1fr; }
  .pm-hero-left { align-items: flex-start; }
  .pm-hero-right { align-items: stretch; flex-direction: column-reverse; }
  .pm-kpis { justify-content: stretch; }
  .pm-kpi { flex: 1; text-align: start; min-width: 0; }
  .pm-title { font-size: 44px; }
  .pm-controls { grid-template-columns: 1fr; }
  .pm-control-span-2 { grid-column: 1; }
  .pm-tiles { grid-template-columns: 1fr; }
  .pm-item { grid-template-columns: auto 44px 1fr; grid-template-rows: auto auto; padding: 10px 12px; }
  .pm-item-emoji { width: 44px; height: 44px; font-size: 24px; }
  .pm-qty { grid-column: 1 / -1; justify-content: flex-end; }
}

/* ========== packing list header tools ========== */
.pm-items-head-main { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; min-width: 0; }
.pm-item-tools { display: inline-flex; gap: 6px; flex-shrink: 0; }
.pm-tool-btn { white-space: nowrap; }

/* ========== packing progress ========== */
.pm-progress { margin: 4px 0 2px; }
.pm-progress-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 7px; }
.pm-progress-label { font-size: 13px; font-weight: 700; color: var(--pm-text); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.pm-progress-clear { font-size: 12px; padding: 2px 6px; }
.pm-progress-track { height: 8px; background: var(--pm-track); border-radius: 999px; overflow: hidden; }
.pm-progress-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--pm-accent) 0%, var(--pm-accent-2) 100%);
  transition: width .4s cubic-bezier(.4,0,.2,1);
}

/* ========== check-off ========== */
.pm-check {
  width: 22px; height: 22px; margin: 0;
  accent-color: var(--pm-accent);
  cursor: pointer; flex-shrink: 0;
}
.pm-check:focus-visible { outline: 2px solid var(--pm-accent); outline-offset: 2px; border-radius: 4px; }
.pm-item-packed { opacity: .55; }
.pm-item-packed .pm-item-name { text-decoration: line-through; text-decoration-color: var(--pm-muted); text-decoration-thickness: 2px; }
.pm-item-packed .pm-item-emoji { filter: grayscale(.4); }

/* zero-quantity items are "excluded": greyed out, with a disabled ✕ box
   in place of the pack checkbox (red ✕ when it's a missing essential). */
.pm-item-zero { background: var(--pm-bg); }
.pm-item-zero:hover { transform: none; box-shadow: none; border-color: var(--pm-border); }
.pm-item-zero .pm-item-emoji { filter: grayscale(1); opacity: .5; }
.pm-item-zero:hover .pm-item-emoji { transform: none; }
.pm-item-zero .pm-item-name {
  color: var(--pm-muted);
  text-decoration: line-through; text-decoration-color: var(--pm-border-strong); text-decoration-thickness: 2px;
}
.pm-item-zero .pm-item-name .pm-tag { opacity: .55; }
.pm-item-zero .pm-item-meta { color: var(--pm-muted); opacity: .75; }
.pm-check-x {
  width: 22px; height: 22px; flex-shrink: 0;
  display: grid; place-items: center;
  border: 1px solid var(--pm-border-strong); border-radius: 6px;
  background: var(--pm-bg); color: var(--pm-muted);
  font-size: 13px; font-weight: 800; line-height: 1;
  cursor: not-allowed; user-select: none;
}
.pm-check-x-danger {
  color: var(--pm-danger);
  border-color: color-mix(in srgb, var(--pm-danger) 55%, transparent);
}

/* ========== print ========== */
.pm-print-head { display: none; }

@media print {
  .pm-app { max-width: none; margin: 0; padding: 0; color: #000; letter-spacing: 0; }
  .pm-hero-bg, .pm-hero, .pm-warnings, .pm-controls, .pm-summary,
  .pm-footer, .pm-item-tools, .pm-progress { display: none !important; }
  .pm-print-head {
    display: block !important; margin: 0 0 14px;
    font-size: 13px; color: #000;
    padding-bottom: 10px; border-bottom: 2px solid #000;
  }
  .pm-grid { grid-template-columns: 1fr; gap: 0; }
  .pm-items { border: 0; box-shadow: none; padding: 0; border-radius: 0; }
  .pm-items-head { margin-bottom: 4px; }
  .pm-h2 { color: #000; }
  .pm-cat { margin-top: 14px; break-inside: avoid; }
  .pm-cat-head { border-color: #999; }
  .pm-cat-name, .pm-cat-meta, .pm-item-name, .pm-item-meta { color: #000 !important; }
  .pm-item {
    background: #fff !important; border: 0; border-bottom: 1px solid #ddd;
    border-radius: 0; padding: 6px 2px; box-shadow: none !important;
    transform: none !important; break-inside: avoid;
  }
  .pm-item-packed { opacity: 1; }
  .pm-item-emoji { border: 0; background: transparent; filter: none; width: 30px; height: 30px; font-size: 20px; }
  .pm-check { width: 16px; height: 16px; -webkit-appearance: auto; appearance: auto; }
  .pm-qty .pm-btn { display: none !important; }
  .pm-qty-val { min-width: auto; color: #000; }
  .pm-tag { color: #000; border: 1px solid #999; background: transparent; }
}

/* ========== RTL polish ========== */
/* Most mirroring is automatic via dir="rtl" + logical properties above;
   these handle the few physical transforms/gradients that can't be. */
.pm-app[dir="rtl"] .pm-snapshot:hover { transform: translateX(-2px); }
.pm-app[dir="rtl"] .pm-card-glow {
  background:
    radial-gradient(80% 100% at 100% 0%, var(--pm-accent-bg) 0%, transparent 50%),
    var(--pm-card);
}
`

export default App
