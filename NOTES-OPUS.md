# NOTES-OPUS - branch `opus-seo-truth-1126` (2026-11-26)

Local branch from `origin/main` (0fbdafd). Nothing was pushed, no PR was
opened, nothing was deployed. Commits are small and one per task (plus one
no-behavior-change refactor before task 7).

## What changed

1. **Truthful verdict** (`src/packing.ts`, new). Catalog, profile rules,
   quantities, totals and the bag verdict moved out of `App.tsx` into a pure
   module.
   - A remembered limit picker: cabin 7 / 8 / 10 kg, checked 20 / 23 kg,
     default 20. It is saved with the trip, snapshots and share links.
   - Backpack (up to 25 L) and carry-on (up to 45 L) now need weight AND
     volume to fit. With a checked limit chosen, a cabin-sized bag is still
     capped at 10 kg (the largest cabin option).
   - Over-limit warnings and the weight gauge follow the chosen limit.
   - "Wear it" on wearable items: one unit leaves the bag totals and is shown
     as "+x kg worn". A fully worn item has no pack checkbox and does not
     count as packable or packed.
   - The default trip (16.43 kg, 41.71 L) used to be labelled "Carry-on"; it
     is now a checked suitcase with the reason shown.
2. **Laundry** - a "laundry every N days" picker (3, 4, 5, 7, 10, 14; default
   7). Per-day items are planned for at most N + 1 days. Lean scales per-day
   multipliers by 0.7. Also fixed a float rounding bug: `ceil(0.3 * 10)` was 4.
3. **Shared links** (`src/share.ts`). Before a `?t=` trip loads, the visitor's
   working trip, packing checks and saved language are kept as a restore
   point in localStorage. That point survives reloads, and a second shared
   link never overwrites it. A banner offers "Restore my trip" / "Keep this
   one". The shared list starts unchecked. A saved language beats the link's
   language, and only the language switch ever saves a language.
4. **Measurement** (`src/analytics.ts`). A guarded `track()` calls
   `goatcounter.count({ path: 'event/<name>', event: true })` for share,
   shared_open, save, load, first_check, five_checks, print, language_change
   and return_visit. It never throws, and retries once on window load if
   count.js is still loading. return_visit uses one localStorage date (no
   cookies) and fires at most once per browser, for a later-day visit within
   14 days of the first. `index.html`'s GoatCounter snippet is byte-identical
   to `main` (checked with a diff).
5. **Language** (`src/lang.ts`). The country/timezone guess is removed.
   Order: saved choice > entry-page path (`/he/`, `/ru/`, `/bg/`) >
   `navigator.languages` in order, by base language only > English with a
   "Language: English - change" note. Picking a language saves it and moves
   the URL to that language's path. No market statistics are claimed anywhere.
6. **SEO/GEO** (`seo/pages.ts`, `seo/plugin.ts`). A Vite plugin fills
   `index.html` for English and, after `vite build`, writes `dist/he|ru|bg/`
   and `sitemap.xml`. It fails the build if a page is incomplete. Each page
   has:
   - a translated title, description, OG and Twitter tags, correct `lang` and
     `dir`, a self canonical, and hreflang en/he/ru/bg + x-default;
   - JSON-LD `WebApplication` + `FAQPage`. The FAQ is generated from the same
     Q&A shown on the page;
   - a static description + FAQ under the app, readable without JS (and
     hidden only when the UI language differs from the page's).

   Also new: `public/robots.txt` and `public/llms.txt` (called a convenience
   file, not a guarantee). Share links now use the sender's language path.
7. **Ski list**: ski pants, thermal layers, ski socks, neck warmer, ski helmet
   and ski pass, named in all four languages. Pants, thermals and socks are
   ski essentials; the helmet is listed but optional. The translation tables
   moved to `src/i18n.ts` first, so a test can check that every item is named
   in every language.
8. **CI**: checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages
   v5, Node 24. I checked the latest releases and that each major tag exists
   via the GitHub API (`api.github.com/repos/actions/*`), and the Node LTS
   lines via `nodejs.org/dist/index.json`.
9. **README** rewritten:
   - four tables, no offline/PWA claim (there is no service worker);
   - the language rule;
   - measurement as cookie-free counting, not anonymous: what count.js sends,
     and that the server sees IP and User-Agent;
   - SEO pages and the current layout.

## What I ran (all on this machine, Node 24.18.1, npm 11.16.0)

- `npm ci` (clean): 169 packages added.
- `npm run build`: exit 0. It wrote `/`, `/he/`, `/ru/`, `/bg/` and
  `sitemap.xml`. Output files are `dist/index.html` (9.13 kB),
  `assets/index-*.js` (285.28 kB, 86.35 kB gzip) and `assets/index-*.css`
  (1.30 kB).
- `npm run typecheck` (`tsc -b`; covers app, config and tests): exit 0.
- `npm run lint`: exit 0.
- `npm test` (vitest 5.1.2): **6 files, 82 tests, 82 passed, 0 failed**:
  - `src/packing.test.ts`: 20, including the 3 pinned reference trips and an
    exhaustive sweep of 3,150 profile/limit/day combinations. No trip shows
    a backpack or carry-on while over the chosen limit or above 10 kg.
    Default trip: at most 8 t-shirts at any length. 21-day default: 16.72 kg.
    Lean 7-day with jacket + sneakers worn: under 8 kg (male and female).
  - `src/lang.test.ts`: 16, covering every rule, including `["en","ru"]` -> en,
    `["uk","ru"]` -> ru, `["lt"]` -> en + note, `["he-IL","en"]` -> he, and
    saved beats detection. A source check confirms no timezone/country code.
  - `src/share.test.ts`: 9. `src/analytics.test.ts`: 12.
    `src/i18n.test.ts`: 12. `seo/pages.test.ts`: 13.
- **Headless browser check**: local Chrome over the DevTools protocol against
  `vite preview` of the production build. Each scenario used an isolated
  profile; the stats server was blocked and GoatCounter stubbed to record
  calls. **24/24 checks passed**:
  - Language: root with `[en,ru]` -> en, `[uk,ru]` -> ru, `[he-IL,en]` -> he;
    `[lt]` and `[kk,uz,ka]` -> en with the note. "change" opens the switch;
    picking bg saves it and moves the URL to `/bg/`. That saved bg then beats
    `he-IL` and the `/he/` page.
  - `/he/` with an English browser: Hebrew UI, `rtl`, Hebrew title, self
    canonical, the full hreflang set, `he_IL`, JSON-LD.
  - `/he/` with JS disabled: the static Hebrew text, 5 FAQ entries and the
    noscript note.
  - Verdict, wear-it, laundry and ski list behave as above in the real UI.
  - Shared `/he/?t=` link: the recipient kept their saved Russian, the
    restore point held their own trip, and restore brought back trip, checks
    and language.
  - Events: share, print, first_check (once), five_checks, save, load,
    shared_open, language_change and return_visit (once) all fired. The
    share link uses `/he/`. No cookies. With GoatCounter missing: no errors.
  - Screenshots of `/he/` (with and without JS), the shared-link banner and
    a ski trip looked right. The script and screenshots were temporary and
    are not committed.
- `npm audit`: 18 findings (1 low, 10 moderate, 7 high), all in dev
  dependencies; `--omit=dev` finds 0. `main`'s lockfile has the same 18.

## Judgment calls worth a look

- **Language storage key.** The old `packmate.lang` key was written on every
  visit, including timezone guesses, so it isn't evidence of a choice. It is
  now ignored and removed; explicit choices live in `packmate.lang.choice.v1`.
  People who had really picked a language will be asked once more, by default.
- **Entry-page path ranks between "saved" and `navigator.languages`.** The
  brief doesn't rank the path; I chose this so `/he/` shows Hebrew. Root `/`
  uses detection.
- `iw` is read as Hebrew (its old ISO code). `mk` is no longer mapped to
  Bulgarian; it is treated as unsupported.
- **Events are not host-prefixed.** `count.js` only applies the
  `goatcounter.path` function when no string path is passed (I read
  `public/count.js` in the GoatCounter repo). Events therefore arrive as
  `event/share` etc. If `stats.d85c.com` counts other sites too, those names
  could mix; prefixing them would mean deviating from the requested call style.
- **count.js also sends `location.search` (`q`)** with every hit. On a share
  link, the pageview can fire before the app strips `?t=`, so the encoded
  trip settings (no personal data) can reach the stats server. That is in the
  README. Avoiding it needs a change to the `index.html` snippet, which I was
  told to keep.
- "Wear it" removes one unit (you wear one t-shirt, not all seven).
- `og:locale` uses `he_IL` / `ru_RU` / `bg_BG` / `en_US`, because that is the
  OG format. It plays no part in language detection.
- Node 24 for CI: a supported LTS line and the one I built with. Node 26 is
  the newer Active LTS; I did not run the build on it.
- `deploy-pages` v4 release notes mention an `actions: read` permission. The
  workflow never had it and has been deploying, so I left permissions
  unchanged. Watch the first v5 run.
- `lucide-react` is in dependencies but imported nowhere. I removed the README
  claim and left the dependency alone.

## Not verified

- The GitHub Actions workflow on GitHub (nothing pushed), so the new action
  majors and the Pages deploy have not run there.
- Real GoatCounter delivery and how `stats.d85c.com` stores data (counts were
  stubbed; GoatCounter also ignores `localhost`).
- Any search-engine or AI-answer indexing or rich-result eligibility; no
  validator or Search Console was used.
- Translation quality of the new he/ru/bg copy (written by me; a native
  read-through is recommended, especially the Hebrew FAQ).
- Browsers other than desktop Chrome (no Safari, Firefox or real phones),
  dark-mode visuals, the print layout and screen readers.
- CI does not run `npm test`. Adding a test step before the build is a
  one-line follow-up, which I left out of the "tiny" bump commit.

## Commits (oldest first)

```
7e2577c Truthful bag verdict: check weight and volume, add limit picker and "wear it"
dcb7482 Laundry-aware quantities and a leaner Lean profile
813183e Shared links no longer overwrite the recipient's trip or language
7fb44eb Count a few product events through GoatCounter, cookie-free
42b9c2d Evidence-led language choice; drop the country/timezone guess
ace62f0 Static, translated entry pages for /, /he/, /ru/, /bg/ plus sitemap, robots, llms.txt
e065e48 Move the four translation tables from App.tsx to src/i18n.ts
7712fca Complete the ski list in all four languages
abef00b CI: bump Pages workflow actions to current majors and Node 24 LTS
fc8b70e README: describe what the app really does, the language rule and measurement
(this file) Add NOTES-OPUS.md
```

Local setup note: this checkout is owned by `BUILTIN/Administrators`, so git
refuses to run here ("dubious ownership"). I passed `safe.directory` per
command through environment variables and did not change any global git config.
