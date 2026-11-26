/*
 * The four translation tables (English, Russian, Bulgarian, Hebrew) and
 * small language helpers used by the UI.
 */
import type { Lang } from './lang'
import type { Category, TravelType, TravelerType } from './packing'

export interface Translations {
  tagline: string
  subtitle: string
  kpi: { items: string; weight: string; volume: string; worn: (kg: string) => string }
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
    laundry: string
    laundryHint: string
    laundryEvery: (n: number) => string
    bagLimit: string
    bagLimitHint: string
    cabin: string
    hold: string
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
    wear: string
    worn: string
    wearAria: (name: string) => string
    wornNote: string
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
    blockedWeight: (capKg: number) => string
    blockedVolume: (capL: number) => string
    blockedBoth: (capKg: number, capL: number) => string
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
    overLimit: (kg: string, limit: number, over: string) => string
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
  share: { button: string; copied: string; openedTitle: string; openedBody: string; restore: string; keep: string }
  print: string
  footer: string
  language: string
}

export const LANGS: { code: Lang; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
]

/** Languages that render right-to-left. */
const RTL_LANGS = new Set<Lang>(['he'])
const isRtl = (l: Lang) => RTL_LANGS.has(l)
export const dirOf = (l: Lang): 'rtl' | 'ltr' => (isRtl(l) ? 'rtl' : 'ltr')

/** Short day suffix used in auto-generated snapshot names. */
export const DAY_SUFFIX: Record<Lang, string> = { en: 'd', ru: 'дн', bg: 'дн', he: 'ד' }

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
  kpi: { items: 'Items', weight: 'Weight', volume: 'Volume', worn: (kg) => `+${kg} kg worn` },
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
    laundry: 'Laundry',
    laundryHint: 'clothes for one wash cycle',
    laundryEvery: (n) => `every ${n} days`,
    bagLimit: 'Bag limit',
    bagLimitHint: 'your airline allowance',
    cabin: 'Cabin',
    hold: 'Checked',
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
    wear: 'Wear it',
    worn: 'Wearing',
    wearAria: (name) => `Wear ${name} on the travel day instead of packing it`,
    wornNote: 'worn on the way, not in the bag',
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
    blockedWeight: (kg) => `Too heavy for a cabin bag (over ${kg} kg)`,
    blockedVolume: (l) => `Too bulky for a cabin bag (over ${l} L)`,
    blockedBoth: (kg, l) => `Too heavy (over ${kg} kg) and too bulky (over ${l} L) for a cabin bag`,
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
    overLimit: (kg, limit, over) => `The bag weighs ${kg} kg - over your ${limit} kg limit. Take out ${over} kg or pick a bigger allowance.`,
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
  share: {
    button: 'Share trip', copied: 'Link copied!',
    openedTitle: 'You opened a shared trip.', openedBody: 'Your own trip was set aside, nothing is lost.',
    restore: 'Restore my trip', keep: 'Keep this one',
  },
  print: 'Print / PDF',
  footer: 'PackMate · pack light, travel far.',
  language: 'Language',
}

const T_RU: Translations = {
  tagline: 'Умная упаковка для любой поездки',
  subtitle: 'Расчёт, а не интуиция. Задаёте параметры — список считается сам.',
  kpi: { items: 'Предметы', weight: 'Вес', volume: 'Объём', worn: (kg) => `+${kg} кг на себе` },
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
    laundry: 'Стирка',
    laundryHint: 'одежда на один цикл стирки',
    laundryEvery: (n) => `каждые ${n} дн.`,
    bagLimit: 'Лимит багажа',
    bagLimitHint: 'норма авиакомпании',
    cabin: 'Ручная кладь',
    hold: 'Багаж',
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
    wear: 'Надеть',
    worn: 'На мне',
    wearAria: (name) => `Надеть «${name}» в дорогу, а не класть в сумку`,
    wornNote: 'надето в дорогу, не в сумке',
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
    blockedWeight: (kg) => `Слишком тяжело для ручной клади (больше ${kg} кг)`,
    blockedVolume: (l) => `Слишком объёмно для ручной клади (больше ${l} л)`,
    blockedBoth: (kg, l) => `Слишком тяжело (больше ${kg} кг) и объёмно (больше ${l} л) для ручной клади`,
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
    overLimit: (kg, limit, over) => `Сумка весит ${kg} кг - больше вашего лимита ${limit} кг. Уберите ${over} кг или выберите норму побольше.`,
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
  share: {
    button: 'Поделиться', copied: 'Ссылка скопирована!',
    openedTitle: 'Вы открыли поездку по ссылке.', openedBody: 'Ваша поездка отложена и не потеряна.',
    restore: 'Вернуть мою поездку', keep: 'Оставить эту',
  },
  print: 'Печать / PDF',
  footer: 'PackMate · меньше вещей — больше дорог.',
  language: 'Язык',
}

const T_BG: Translations = {
  tagline: 'Умно стягане за всяко пътуване',
  subtitle: 'Сметката е наука, не интуиция. Задаваш дните — списъкът се сглобява сам.',
  kpi: { items: 'Предмети', weight: 'Тегло', volume: 'Обем', worn: (kg) => `+${kg} кг облечени` },
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
    laundry: 'Пране',
    laundryHint: 'дрехи за един цикъл пране',
    laundryEvery: (n) => `на всеки ${n} дни`,
    bagLimit: 'Лимит на багажа',
    bagLimitHint: 'нормата на авиокомпанията',
    cabin: 'Ръчен',
    hold: 'Чекиран',
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
    wear: 'Облечи',
    worn: 'Облечено',
    wearAria: (name) => `Облечи „${name}“ за пътя, вместо да го слагаш в багажа`,
    wornNote: 'облечено за пътя, не е в багажа',
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
    blockedWeight: (kg) => `Твърде тежко за ръчен багаж (над ${kg} кг)`,
    blockedVolume: (l) => `Твърде обемно за ръчен багаж (над ${l} л)`,
    blockedBoth: (kg, l) => `Твърде тежко (над ${kg} кг) и обемно (над ${l} л) за ръчен багаж`,
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
    overLimit: (kg, limit, over) => `Багажът тежи ${kg} кг - над лимита ти от ${limit} кг. Извади ${over} кг или избери по-голяма норма.`,
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
  share: {
    button: 'Сподели', copied: 'Връзката е копирана!',
    openedTitle: 'Отвори споделено пътуване.', openedBody: 'Твоето пътуване е запазено настрана, нищо не е изгубено.',
    restore: 'Върни моето пътуване', keep: 'Остави това',
  },
  print: 'Печат / PDF',
  footer: 'PackMate · стягай леко, пътувай далече.',
  language: 'Език',
}

const T_HE: Translations = {
  tagline: 'אריזה חכמה לכל טיול',
  subtitle: 'מבוסס על חישוב, לא על תחושה. מגדירים את הטיול והרשימה מסתדרת לבד.',
  kpi: { items: 'פריטים', weight: 'משקל', volume: 'נפח', worn: (kg) => `+${kg} ק"ג לבוש` },
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
    laundry: 'כביסה',
    laundryHint: 'בגדים למחזור כביסה אחד',
    laundryEvery: (n) => `כל ${n} ימים`,
    bagLimit: 'מגבלת משקל',
    bagLimitHint: 'לפי חברת התעופה',
    cabin: 'כבודת יד',
    hold: 'כבודה רשומה',
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
    wear: 'ללבוש',
    worn: 'לבוש',
    wearAria: (name) => `ללבוש ${name} בדרך במקום לארוז`,
    wornNote: 'לבוש בדרך, לא בתיק',
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
    blockedWeight: (kg) => `כבד מדי לכבודת יד (מעל ${kg} ק"ג)`,
    blockedVolume: (l) => `גדול מדי לכבודת יד (מעל ${l} ליטר)`,
    blockedBoth: (kg, l) => `כבד מדי (מעל ${kg} ק"ג) וגדול מדי (מעל ${l} ליטר) לכבודת יד`,
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
    overLimit: (kg, limit, over) => `התיק שוקל ${kg} ק"ג - מעל המגבלה שלך של ${limit} ק"ג. כדאי להוציא ${over} ק"ג או לבחור מכסה גדולה יותר.`,
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
  share: {
    button: 'שיתוף הטיול', copied: 'הקישור הועתק!',
    openedTitle: 'פתחת טיול ששותף איתך.', openedBody: 'הטיול שלך נשמר בצד, שום דבר לא אבד.',
    restore: 'שחזור הטיול שלי', keep: 'להישאר עם זה',
  },
  print: 'הדפסה / PDF',
  footer: 'PackMate · לארוז קל, להגיע רחוק.',
  language: 'שפה',
}

export const TRANSLATIONS: Record<Lang, Translations> = { en: T_EN, ru: T_RU, bg: T_BG, he: T_HE }
