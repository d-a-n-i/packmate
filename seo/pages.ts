/*
 * Static, crawlable content for the four entry pages (/, /he/, /ru/, /bg/):
 * head tags (title, description, canonical, hreflang, Open Graph, Twitter,
 * JSON-LD) and a visible "what PackMate does" section with a short FAQ.
 *
 * The FAQ JSON-LD is generated from the same Q&A the page shows, so the
 * structured data can only describe text that is really on the page.
 * Nothing here promises rankings or placement in any search or AI product.
 */

export type PageLang = 'en' | 'he' | 'ru' | 'bg'

export const SITE = 'https://packmate.d85c.com'
export const PAGE_LANGS: PageLang[] = ['en', 'he', 'ru', 'bg']
export const PAGE_PATH: Record<PageLang, string> = { en: '/', he: '/he/', ru: '/ru/', bg: '/bg/' }
export const pageUrl = (l: PageLang) => SITE + PAGE_PATH[l]
export const dirOf = (l: PageLang) => (l === 'he' ? 'rtl' : 'ltr')
const OG_LOCALE: Record<PageLang, string> = { en: 'en_US', he: 'he_IL', ru: 'ru_RU', bg: 'bg_BG' }
const NATIVE_NAME: Record<PageLang, string> = { en: 'English', he: 'עברית', ru: 'Русский', bg: 'Български' }
const REPO = 'https://github.com/d-a-n-i/packmate'

export interface PageCopy {
  title: string
  description: string
  ogAlt: string
  heading: string
  intro: string
  features: string[]
  faqTitle: string
  faq: { q: string; a: string }[]
  noscript: string
  otherLangs: string
  project: string
  source: string
}

export const COPY: Record<PageLang, PageCopy> = {
  en: {
    title: 'PackMate - Packing List Calculator for Any Trip',
    description:
      'Free packing list builder: set trip length, trip type and laundry, and PackMate suggests quantities, adds up weight and volume, and checks them against your cabin or checked bag limit. No account, runs in your browser.',
    ogAlt: 'PackMate - packing list calculator',
    heading: 'What PackMate does',
    intro:
      'PackMate is a free packing list calculator. You set how many days you travel, the kind of trip (city, beach, ski, hiking or business), a traveler profile and how often you can do laundry. It suggests a quantity for every item and adds up the weight and volume of what goes in the bag.',
    features: [
      'Checks the bag against your limit: pick cabin 7, 8 or 10 kg, or checked 20 or 23 kg. A backpack or carry-on is only suggested when both the weight and the volume fit.',
      'Mark what you wear on the travel day: worn items leave the bag totals.',
      'Laundry-aware: clothing is suggested for one wash cycle, not for every day of a long trip.',
      'Tick items off as you pack, save trips, print the list, or share a link that opens the same trip.',
      'Available in English, Hebrew, Russian and Bulgarian.',
    ],
    faqTitle: 'Questions',
    faq: [
      {
        q: 'Do I need an account?',
        a: "No. PackMate runs in your browser. Trips and checkmarks are kept in your browser's local storage on your device; there is no account and no copy of your list on a server.",
      },
      {
        q: 'How does PackMate choose between a backpack, a carry-on and a suitcase?',
        a: 'It picks the smallest bag that passes both checks: up to 25 L for a backpack or 45 L for a carry-on, and a weight within the cabin limit you chose (the app never treats more than 10 kg as cabin baggage). Anything heavier or bulkier needs a checked suitcase.',
      },
      {
        q: 'Why does it not suggest one t-shirt per day on a long trip?',
        a: 'Clothing is planned for one laundry cycle plus a spare: with laundry every 7 days you get at most 8 of each per-day item. You can change the laundry interval and any quantity.',
      },
      {
        q: "Does PackMate know my airline's rules?",
        a: 'No. It has no airline database. Choose the allowance on your ticket, and check size limits and other rules with your airline.',
      },
      {
        q: 'Is anything tracked?',
        a: 'PackMate counts page views and a few actions (such as sharing or printing) with GoatCounter, without cookies. Like any web request, the counter receives your IP address, the page address and browser details; the contents of your list are not put into event names.',
      },
    ],
    noscript: 'The interactive packing list needs JavaScript.',
    otherLangs: 'Other languages:',
    project: 'A personal open-source project.',
    source: 'Source on GitHub',
  },
  he: {
    title: 'PackMate - מחשבון רשימת אריזה לכל טיול',
    description:
      'בונה רשימת אריזה חינמי: מגדירים משך טיול, סוג טיול וכביסה, ו-PackMate מציע כמויות, מחשב משקל ונפח ובודק אותם מול מגבלת כבודת היד או הכבודה הרשומה שלכם. בלי הרשמה, הכול רץ בדפדפן.',
    ogAlt: 'PackMate - מחשבון רשימת אריזה',
    heading: 'מה PackMate עושה',
    intro:
      'PackMate הוא מחשבון חינמי לרשימת אריזה. מגדירים כמה ימים נמשך הטיול, את סוג הטיול (עיר, ים, סקי, טרקים או עסקים), פרופיל מטייל וכל כמה זמן אפשר לכבס. PackMate מציע כמות לכל פריט ומחשב את המשקל והנפח של מה שנכנס לתיק.',
    features: [
      'בודק את התיק מול המגבלה שלכם: כבודת יד 7, 8 או 10 ק"ג, או כבודה רשומה 20 או 23 ק"ג. תיק גב או טרולי מוצעים רק כשגם המשקל וגם הנפח מתאימים.',
      'סמנו מה תלבשו בדרך: פריטים לבושים לא נספרים במשקל התיק.',
      'מתחשב בכביסה: בגדים מחושבים למחזור כביסה אחד, לא לכל יום בטיול ארוך.',
      'מסמנים מה נארז, שומרים טיולים, מדפיסים את הרשימה או משתפים קישור שפותח את אותו טיול.',
      'זמין באנגלית, בעברית, ברוסית ובבולגרית.',
    ],
    faqTitle: 'שאלות',
    faq: [
      {
        q: 'צריך להירשם?',
        a: 'לא. PackMate רץ בדפדפן. הטיולים והסימונים נשמרים באחסון המקומי של הדפדפן במכשיר שלכם; אין חשבון ואין עותק של הרשימה בשרת.',
      },
      {
        q: 'איך PackMate בוחר בין תיק גב, טרולי ומזוודה?',
        a: 'הוא בוחר את התיק הקטן ביותר שעובר את שתי הבדיקות: עד 25 ליטר לתיק גב או 45 ליטר לטרולי, ומשקל בתוך מגבלת כבודת היד שבחרתם (האפליקציה אף פעם לא מחשיבה יותר מ-10 ק"ג ככבודת יד). כל מה שכבד או גדול יותר דורש מזוודה רשומה.',
      },
      {
        q: 'למה לא מוצעת חולצה לכל יום בטיול ארוך?',
        a: 'הבגדים מחושבים למחזור כביסה אחד ועוד רזרבה: עם כביסה כל 7 ימים מקבלים לכל היותר 8 יחידות מכל פריט יומי. אפשר לשנות את תדירות הכביסה וכל כמות.',
      },
      {
        q: 'PackMate מכיר את הכללים של חברת התעופה שלי?',
        a: 'לא. אין בו מאגר של חברות תעופה. בחרו את המכסה שמופיעה בכרטיס, ובדקו מגבלות גודל וכללים אחרים מול חברת התעופה.',
      },
      {
        q: 'האם משהו נמדד?',
        a: 'PackMate סופר צפיות בדפים וכמה פעולות (כמו שיתוף או הדפסה) באמצעות GoatCounter, בלי עוגיות. כמו בכל בקשה באינטרנט, המונה מקבל את כתובת ה-IP, כתובת הדף ופרטי הדפדפן; תוכן הרשימה שלכם לא נכנס לשמות האירועים.',
      },
    ],
    noscript: 'הרשימה האינטראקטיבית דורשת JavaScript.',
    otherLangs: 'בשפות אחרות:',
    project: 'פרויקט אישי בקוד פתוח.',
    source: 'הקוד ב-GitHub',
  },
  ru: {
    title: 'PackMate - калькулятор списка вещей для поездки',
    description:
      'Бесплатный список вещей в поездку: укажите длительность, тип поездки и стирку, и PackMate предложит количество, посчитает вес и объём и сверит их с лимитом ручной клади или багажа. Без регистрации, всё работает в браузере.',
    ogAlt: 'PackMate - калькулятор списка вещей',
    heading: 'Что делает PackMate',
    intro:
      'PackMate - бесплатный калькулятор списка вещей. Вы указываете, сколько дней длится поездка, её тип (город, пляж, лыжи, поход или командировка), профиль путешественника и как часто можно стирать. PackMate предлагает количество для каждой вещи и считает вес и объём того, что поедет в сумке.',
    features: [
      'Сверяет сумку с вашим лимитом: ручная кладь 7, 8 или 10 кг или багаж 20 или 23 кг. Рюкзак или ручная кладь предлагаются, только если подходят и вес, и объём.',
      'Отметьте, что наденете в дорогу: надетые вещи не входят в вес сумки.',
      'Учитывает стирку: одежда берётся на один цикл стирки, а не на каждый день долгой поездки.',
      'Отмечайте собранное, сохраняйте поездки, печатайте список или делитесь ссылкой, которая открывает ту же поездку.',
      'Доступен на английском, иврите, русском и болгарском.',
    ],
    faqTitle: 'Вопросы',
    faq: [
      {
        q: 'Нужна ли регистрация?',
        a: 'Нет. PackMate работает в браузере. Поездки и отметки хранятся в локальном хранилище браузера на вашем устройстве; аккаунта и копии списка на сервере нет.',
      },
      {
        q: 'Как PackMate выбирает между рюкзаком, ручной кладью и чемоданом?',
        a: 'Выбирается самая маленькая сумка, которая проходит обе проверки: до 25 л для рюкзака или 45 л для ручной клади, и вес в пределах выбранного лимита ручной клади (приложение никогда не считает ручной кладью больше 10 кг). Всё, что тяжелее или объёмнее, требует чемодана в багаж.',
      },
      {
        q: 'Почему для долгой поездки не предлагается футболка на каждый день?',
        a: 'Одежда рассчитывается на один цикл стирки плюс запас: при стирке раз в 7 дней - не больше 8 штук каждой ежедневной вещи. Интервал стирки и любое количество можно изменить.',
      },
      {
        q: 'Знает ли PackMate правила моей авиакомпании?',
        a: 'Нет, базы авиакомпаний в нём нет. Выберите норму из вашего билета, а ограничения по размерам и другие правила уточняйте у авиакомпании.',
      },
      {
        q: 'Что-нибудь отслеживается?',
        a: 'PackMate считает просмотры страниц и несколько действий (например, «поделиться» или печать) через GoatCounter, без cookie. Как и при любом запросе в интернете, счётчик получает IP-адрес, адрес страницы и сведения о браузере; содержимое вашего списка в названия событий не попадает.',
      },
    ],
    noscript: 'Для интерактивного списка нужен JavaScript.',
    otherLangs: 'На других языках:',
    project: 'Личный проект с открытым кодом.',
    source: 'Исходный код на GitHub',
  },
  bg: {
    title: 'PackMate - калкулатор за списък за багаж',
    description:
      'Безплатен списък за опаковане на багаж: задай дължина, вид пътуване и пране, а PackMate предлага количества, смята тегло и обем и ги сверява с лимита за ръчен или чекиран багаж. Без регистрация, работи в браузъра.',
    ogAlt: 'PackMate - калкулатор за списък за багаж',
    heading: 'Какво прави PackMate',
    intro:
      'PackMate е безплатен калкулатор за списък за багаж. Задаваш колко дни пътуваш, вида пътуване (град, плаж, ски, туризъм или служебно), профил на пътуващия и колко често можеш да переш. PackMate предлага количество за всеки предмет и сумира теглото и обема на това, което влиза в багажа.',
    features: [
      'Сверява багажа с твоя лимит: ръчен 7, 8 или 10 кг или чекиран 20 или 23 кг. Раница или ръчен багаж се предлагат само когато и теглото, и обемът се побират.',
      'Отбележи какво ще облечеш за пътя: облечените вещи не влизат в теглото на багажа.',
      'Съобразено с прането: дрехите са за един цикъл пране, а не за всеки ден от дългото пътуване.',
      'Отмятай събраното, запазвай пътувания, печатай списъка или сподели връзка, която отваря същото пътуване.',
      'Достъпен на английски, иврит, руски и български.',
    ],
    faqTitle: 'Въпроси',
    faq: [
      {
        q: 'Нужна ли е регистрация?',
        a: 'Не. PackMate работи в браузъра. Пътуванията и отметките се пазят в локалното хранилище на браузъра на твоето устройство; няма акаунт и няма копие на списъка на сървър.',
      },
      {
        q: 'Как PackMate избира между раница, ръчен багаж и куфар?',
        a: 'Избира най-малкия багаж, който минава и двете проверки: до 25 л за раница или 45 л за ръчен багаж, и тегло в рамките на избрания лимит за ръчен багаж (приложението никога не смята повече от 10 кг за ръчен багаж). Всичко по-тежко или по-обемно изисква чекиран куфар.',
      },
      {
        q: 'Защо не предлага по една тениска на ден за дълго пътуване?',
        a: 'Дрехите са изчислени за един цикъл пране плюс резерва: при пране на всеки 7 дни получаваш най-много по 8 броя от всяка дневна дреха. Можеш да промениш интервала на прането и всяко количество.',
      },
      {
        q: 'Знае ли PackMate правилата на моята авиокомпания?',
        a: 'Не. Няма база данни с авиокомпании. Избери нормата от билета си, а за размери и други правила провери при авиокомпанията.',
      },
      {
        q: 'Следи ли се нещо?',
        a: 'PackMate брои прегледите на страници и няколко действия (например споделяне или печат) с GoatCounter, без бисквитки. Както при всяка заявка в интернет, броячът получава IP адреса, адреса на страницата и данни за браузъра; съдържанието на списъка ти не влиза в имената на събитията.',
      },
    ],
    noscript: 'За интерактивния списък е нужен JavaScript.',
    otherLangs: 'На други езици:',
    project: 'Личен проект с отворен код.',
    source: 'Кодът в GitHub',
  },
}

/* ------------------------------------------------------------------ rendering */

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON for a <script> tag: escape '<' so the text can never close the tag. */
const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')

export function structuredData(l: PageLang) {
  const c = COPY[l]
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'PackMate',
        url: pageUrl(l),
        description: c.description,
        inLanguage: l,
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Any (runs in a web browser)',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        image: `${SITE}/og.png`,
      },
      {
        '@type': 'FAQPage',
        inLanguage: l,
        mainEntity: c.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }
}

export function renderHead(l: PageLang): string {
  const c = COPY[l]
  const url = pageUrl(l)
  const lines = [
    `<title>${esc(c.title)}</title>`,
    `<meta name="description" content="${esc(c.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...PAGE_LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${pageUrl(x)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl('en')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PackMate" />`,
    `<meta property="og:title" content="${esc(c.title)}" />`,
    `<meta property="og:description" content="${esc(c.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(c.ogAlt)}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[l]}" />`,
    ...PAGE_LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${OG_LOCALE[x]}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(c.title)}" />`,
    `<meta name="twitter:description" content="${esc(c.description)}" />`,
    `<meta name="twitter:image" content="${SITE}/og.png" />`,
    `<meta name="twitter:image:alt" content="${esc(c.ogAlt)}" />`,
    `<script type="application/ld+json">${jsonForScript(structuredData(l))}</script>`,
  ]
  return lines.map((x) => `    ${x}`).join('\n')
}

export function renderBody(l: PageLang): string {
  const c = COPY[l]
  const others = PAGE_LANGS.filter((x) => x !== l)
    .map((x) => `<a href="${PAGE_PATH[x]}" hreflang="${x}" lang="${x}">${esc(NATIVE_NAME[x])}</a>`)
    .join(' · ')
  return `    <noscript><p class="pm-noscript" lang="${l}" dir="${dirOf(l)}">${esc(c.noscript)}</p></noscript>
    <section id="pm-about" class="pm-about" lang="${l}" dir="${dirOf(l)}">
      <h2>${esc(c.heading)}</h2>
      <p>${esc(c.intro)}</p>
      <ul>
${c.features.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>
      <h2>${esc(c.faqTitle)}</h2>
      <dl>
${c.faq.map(({ q, a }) => `        <dt>${esc(q)}</dt>\n        <dd>${esc(a)}</dd>`).join('\n')}
      </dl>
      <p class="pm-about-foot">${esc(c.otherLangs)} ${others}<br />${esc(c.project)} <a href="${REPO}">${esc(c.source)}</a></p>
    </section>`
}

export const HEAD_START = '<!-- seo:head:start -->'
export const HEAD_END = '<!-- seo:head:end -->'
export const BODY_START = '<!-- seo:body:start -->'
export const BODY_END = '<!-- seo:body:end -->'

/** Fill the placeholders of the source index.html (dev and build) for one language. */
export function fillTemplate(html: string, l: PageLang): string {
  return html
    .replace(/<html[^>]*>/, `<html lang="${l}" dir="${dirOf(l)}">`)
    .replace('<!--seo:head-->', `${HEAD_START}\n${renderHead(l)}\n    ${HEAD_END}`)
    .replace('<!--seo:body-->', `${BODY_START}\n${renderBody(l)}\n    ${BODY_END}`)
}

/** Turn a built English page into another language's page. */
export function relocalize(builtEnglish: string, l: PageLang): string {
  const swap = (html: string, start: string, end: string, body: string) => {
    const a = html.indexOf(start)
    const b = html.indexOf(end)
    if (a < 0 || b < a) throw new Error(`seo: markers ${start} / ${end} not found in built index.html`)
    return html.slice(0, a + start.length) + '\n' + body + '\n    ' + html.slice(b)
  }
  let out = builtEnglish.replace(/<html[^>]*>/, `<html lang="${l}" dir="${dirOf(l)}">`)
  out = swap(out, HEAD_START, HEAD_END, renderHead(l))
  out = swap(out, BODY_START, BODY_END, renderBody(l))
  return out
}

export function renderSitemap(): string {
  const alternates = PAGE_LANGS.map(
    (x) => `    <xhtml:link rel="alternate" hreflang="${x}" href="${pageUrl(x)}" />`,
  ).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('en')}" />`)
  const urls = PAGE_LANGS.map((l) => `  <url>\n    <loc>${pageUrl(l)}</loc>\n${alternates.join('\n')}\n  </url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`
}
