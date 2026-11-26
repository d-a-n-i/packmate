# PackMate 🧳

**A packing list calculator: set the trip, the list balances itself.**

PackMate builds a right-sized packing list from a few inputs. Pick the trip
length, trip type, traveler profile and how often you can do laundry; it
suggests a quantity for every item, adds up the weight and volume of what goes
in the bag, and checks that against the bag limit you choose.

It is a personal tool and portfolio piece: free, no accounts, no ads.

🔗 **Live:** [packmate.d85c.com](https://packmate.d85c.com)
(also [/he/](https://packmate.d85c.com/he/), [/ru/](https://packmate.d85c.com/ru/),
[/bg/](https://packmate.d85c.com/bg/))

## Features

- **Scaled list** - per-day items (t-shirts, socks...) scale with trip
  length; single items (passport, charger...) stay at one. Every quantity is
  editable, with a one-tap reset to the suggestion.
- **Laundry-aware** - "laundry every N days" (3 to 14, default 7). Per-day
  clothing is suggested for at most N + 1 days, so a 21-day trip with weekly
  laundry suggests 8 t-shirts, not 21. The Lean profile also scales per-day
  multipliers down (x0.7).
- **Profiles that reshape the list** - traveler profile (Lean / IT Pro /
  Prepared), trip type (City / Beach / Ski / Hiking / Business) and a hygiene
  profile add, hide and re-prioritize gear. Ski trips get ski pants, thermal
  layers, ski socks, a neck warmer, a helmet and a ski pass.
- **Bag limit and a truthful verdict** - pick your allowance (cabin 7, 8 or
  10 kg; checked 20 or 23 kg; remembered with the trip). Backpack (up to
  25 L) or carry-on (up to 45 L) is only recommended when both the weight and
  the volume fit; a cabin bag is never allowed above 10 kg, even with a
  checked limit selected. Otherwise the verdict is a checked suitcase, with
  the reason shown, and an over-limit warning says how much to take out.
- **"Wear it"** - tap it on clothes and shoes you wear on the travel day: one
  unit leaves the bag totals (shown separately as "worn") and an item you
  wear entirely no longer counts as something to pack.
- **Check off as you pack** - live progress bar; progress is saved locally.
- **Saved and shareable trips** - save a setup to revisit later, or copy a
  share link that reproduces the trip on any device. Opening someone else's
  link never loses your own trip: it is set aside first and a banner offers
  one-tap "Restore my trip" (or "Keep this one").
- **Print / save as PDF** - a clean, ink-friendly checklist.
- **Four languages** - English, עברית (full right-to-left), Русский,
  Български. See [Language](#language) for how the starting language is
  chosen.
- **Add to home screen** - a web app manifest and icons are included. There
  is no service worker, so PackMate does not work offline; it needs a
  connection to load.
- Automatic light/dark theme.

There is no account and no backend. Trips, saved trips, checkmarks and the
language choice live in your browser's `localStorage`.

## Language

The starting language is chosen from what the visitor has told the browser or
the app, never from where they are:

1. A language picked with the language switch is saved and always wins.
   (Only the switch writes it; detection and share links never do.)
2. Otherwise, a language entry page that was opened (`/he/`, `/ru/`, `/bg/`).
3. Otherwise, `navigator.languages` is walked **in order** and the first tag
   whose base language is supported (en, he, ru, bg) wins. An earlier
   supported language beats a later one (`["en", "ru"]` gives English), and
   unsupported languages are skipped rather than mapped to a "nearby" one
   (`["uk", "ru"]` gives Russian; `["lt"]` alone gives English). Region
   subtags are ignored (`en-IL` is English).
4. If nothing matches: English, with a small "Language: English - change"
   note next to the switch.

Country, region, timezone, IP address and other location or identity signals
are not used. The switch is always visible. The rules live in `src/lang.ts`
with tests in `src/lang.test.ts`.

## Measurement

PackMate counts page views and a handful of events with
[GoatCounter](https://www.goatcounter.com/) (`count.js` from
`stats.d85c.com`, loaded in `index.html`). PackMate sets **no cookies**.

- **Page views:** the counted path is `<host><path>` (for example
  `packmate.d85c.com/he/`), via the `window.goatcounter.path` function in
  `index.html`. `count.js` takes the path from the page's canonical link.
- **Events** (`src/analytics.ts`): `share`, `shared_open`, `save`, `load`,
  `first_check`, `five_checks`, `print`, `language_change`, `return_visit`,
  sent as `goatcounter.count({ path: 'event/<name>', event: true })`. Event
  names are fixed strings; nothing from your list goes into them. Because the
  path is given as a string, these event paths are not host-prefixed.
  `first_check` and `five_checks` fire at most once per page load.
  `return_visit` fires at most once per browser, for a visit on a later
  calendar day within 14 days of the first visit; that is tracked with a
  date in `localStorage` (`packmate.visits.v1`), not a cookie.
- **What the counter receives with each count:** the path, the page title,
  the referrer, the screen width, the page's query string and a bot flag
  (that is what `count.js` sends). On a share link, the query string holds
  the encoded trip settings (days, profile, quantities; no personal data).
- **What the server sees:** like any web request, the GoatCounter server
  receives your IP address and browser User-Agent. What it stores and derives
  from them depends on how that GoatCounter instance is configured. This is
  cookie-free counting, not anonymity.
- If `count.js` is blocked or fails to load, the app works the same; the
  helper never throws. GoatCounter does not count `localhost`.

## SEO / GEO

GitHub Pages serves static files only, so the build emits real pages for
each language:

- `/`, `/he/`, `/ru/`, `/bg/` - each with a translated title, meta
  description, Open Graph and Twitter tags, `html lang`/`dir`, a canonical
  link, `hreflang` alternates (plus `x-default` = `/`), JSON-LD
  (`WebApplication` and an `FAQPage` generated from the FAQ that is visible on
  the page), and a short static description + FAQ under the app that is
  readable without JavaScript.
- `sitemap.xml` (the four URLs with alternates), `robots.txt`, and
  `llms.txt` - a plain-text summary offered as a convenience for people and
  language-model tools. None of these guarantee indexing or placement
  anywhere.

The copy lives in `seo/pages.ts`; `seo/plugin.ts` (a Vite plugin) fills
`index.html` for English in dev and build, then writes the other pages and
the sitemap after `vite build`, failing the build if a page is incomplete.
Share links use the sender's language path (`/he/?t=...`); a recipient's own
saved language still wins.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build, [Vitest](https://vitest.dev/) for tests
- Icons are emoji and inline SVG
- Deployed to GitHub Pages via GitHub Actions

## Getting started

```bash
npm ci            # install dependencies
npm run dev       # start the dev server (http://localhost:5173)
npm test          # run the unit tests (vitest)
npm run typecheck # type-check app, config and tests
npm run build     # type-check + production build to dist/ (incl. /he/, /ru/, /bg/)
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

## Project structure

```
index.html                 # document shell; SEO placeholders, GoatCounter snippet
seo/
  pages.ts                 # per-language head tags, static text, FAQ, sitemap
  plugin.ts                # Vite plugin that writes the entry pages + sitemap
public/
  robots.txt, llms.txt     # crawler hints / plain-text summary
  favicon.svg, icon-*.png, apple-touch-icon.png, og.png
  manifest.webmanifest     # web app manifest (no service worker)
  CNAME                    # custom domain for GitHub Pages
src/
  App.tsx                  # UI: state, components and styles
  packing.ts               # catalog, profile rules, quantities, totals, bag verdict
  i18n.ts                  # the four translation tables (en, ru, bg, he)
  lang.ts                  # language rules
  share.ts                 # share links + restore point for shared trips
  analytics.ts             # guarded GoatCounter event helper, return visits
  *.test.ts                # unit tests
  index.css                # page backdrop, font base, static-text styles
  main.tsx                 # React entry point
.github/workflows/deploy.yml  # build + deploy to GitHub Pages
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the
site on Node 24 and publishes `dist/` to GitHub Pages. The custom domain is
set via `public/CNAME`.
