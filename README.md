# PackMate 🧳

**Smart packing for any trip — powered by math, not vibes.**

PackMate builds a right-sized packing list from a few inputs. Pick your trip
length, traveler profile and trip type, and it scales each item's quantity,
tracks total weight and volume in real time, recommends the luggage that fits,
and flags when you've over- or under-packed.

🔗 **Live:** [packmate.d85c.com](https://packmate.d85c.com)

## Features

- **Algorithmic list** — per-day items (t-shirts, socks…) scale with trip
  length; fixed items (passport, charger…) stay at one. Every quantity stays
  editable, with a one-tap reset back to the suggestion.
- **Profiles that reshape the list** — traveler profile (Lean / IT Pro /
  Prepared), trip type (City / Beach / Ski / Hiking / Business) and a hygiene
  profile add, hide and re-prioritize gear. Ski trips gain goggles; beach trips
  gain sunscreen and a towel.
- **Live telemetry** — running totals for item count, weight and volume, with
  gauges marking the carry-on (25 L / 45 L) and 20 kg airline thresholds.
- **Luggage recommendation** — backpack → carry-on → suitcase, chosen from the
  packed volume.
- **Smart warnings** — over the weight/volume limit, more than double a
  suggested quantity, or an essential left at zero.
- **Check off as you pack** — tick items as they go in the bag, with a live
  progress bar; your progress is saved locally.
- **Saved & shareable trips** — snapshot a setup to revisit later, or copy a
  share link that reproduces the exact trip on any device.
- **Print / save as PDF** — a clean, ink-friendly checklist to carry with you.
- **Three languages** — English, Русский, Български, auto-detected from the
  browser (with a manual switcher).
- **Installable PWA** with automatic light/dark theming.

Everything runs client-side; trip state and snapshots live in `localStorage`.
There is no account and no backend.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build
- [lucide-react](https://lucide.dev/) icons
- Deployed to GitHub Pages via GitHub Actions

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

## Project structure

```
index.html                 # document head: SEO, Open Graph, PWA manifest link
public/
  favicon.svg              # app mark (the PackMate suitcase)
  icon-192/512.png         # maskable PWA icons
  apple-touch-icon.png     # iOS home-screen icon
  og.png                   # 1200×630 social share card
  manifest.webmanifest     # PWA manifest
  CNAME                    # custom domain for GitHub Pages
src/
  App.tsx                  # the entire app: data, i18n, logic and UI
  index.css                # page backdrop + font base
  main.tsx                 # React entry point
.github/workflows/deploy.yml  # build + deploy to GitHub Pages
```

`App.tsx` is intentionally self-contained: the item catalog, per-profile rules,
the three translation tables, and all components live in one file with its
styles inlined.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and publishes `dist/` to GitHub Pages. The custom domain is set via
`public/CNAME`.
