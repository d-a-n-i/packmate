import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'

import {
  CATEGORY_ORDER,
  DEFAULT_TRIP,
  bagQty,
  chooseLuggage,
  computeTotals,
  isCabinLimit,
  listQty,
  normalizeTrip,
  resolveItems,
  suggestedQty,
  wornQty,
  BACKPACK_MAX_L,
  BAG_LIMITS,
  CABIN_MAX_KG,
  LAUNDRY_OPTIONS,
  type LaundryDays,
  CARRY_ON_MAX_L,
  type BagLimit,
  type LuggageKey,
  type Category,
  type Gender,
  type ResolvedItem,
  type TravelType,
  type TravelerType,
  type TripState,
} from './packing'

/* ============================================================ TYPES ============================================================ */

import { noteVisit, track, trackOncePerPage } from './analytics'
import { DAY_SUFFIX, LANGS, TRANSLATIONS, dirOf } from './i18n'
import {
  LANG_CHOICE_KEY,
  LANG_PATH,
  LEGACY_LANG_KEY,
  browserLanguages,
  detectLanguage,
  isLang,
  langFromPath,
  type Lang,
  type LangSource,
} from './lang'
import {
  PACKED_KEY,
  STATE_KEY,
  bootFromSearch,
  clearRestorePoint,
  encodeTrip,
  type RestorePoint,
} from './share'

interface Snapshot {
  id: string
  name: string
  savedAt: number
  state: TripState
}

interface Warning {
  type: 'over' | 'under'
  msg: string
}

/* ============================================================ ITEMS ============================================================ */

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


const LUGGAGE_EMOJI: Record<LuggageKey, string> = { backpack: '🎒', carryOn: '🧳', suitcase: '🧰' }

/* ============================================================ LANGUAGE ============================================================ */

// The rules live in lang.ts (saved choice > entry-page path > browser
// languages in order > English with a note). No country or timezone is used.

/** The language explicitly chosen with the switch (detection and links never write it). */
function readSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_CHOICE_KEY)
    return isLang(v) ? v : null
  } catch {
    return null
  }
}

function bootLanguage(): { lang: Lang; source: LangSource } {
  if (typeof window === 'undefined') return { lang: 'en', source: 'fallback' }
  try { localStorage.removeItem(LEGACY_LANG_KEY) } catch { /* ignore */ }
  return detectLanguage({
    saved: readSavedLang(),
    pathLang: langFromPath(window.location.pathname),
    languages: browserLanguages(typeof navigator !== 'undefined' ? navigator : undefined),
  })
}

/** Keep the address bar on the chosen language's entry page (/, /he/, /ru/, /bg/). */
function syncLangPath(l: Lang) {
  try {
    const { pathname, search, hash } = window.location
    const onEntryPage = pathname === '/' || pathname === '/index.html' || langFromPath(pathname) !== null
    if (onEntryPage && pathname !== LANG_PATH[l]) window.history.replaceState(null, '', LANG_PATH[l] + search + hash)
  } catch { /* ignore */ }
}

/* ============================================================ PERSISTENCE ============================================================ */

const SNAPSHOTS_KEY = 'packmate.snapshots.v2'

function loadState(): TripState {
  if (typeof window === 'undefined') return DEFAULT_TRIP
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return DEFAULT_TRIP
    return normalizeTrip(JSON.parse(raw))
  } catch {
    return DEFAULT_TRIP
  }
}

function saveStateToStorage(state: TripState) {
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
    if (!Array.isArray(parsed)) return []
    // Older snapshots predate the bag limit / worn fields: normalize them.
    return parsed
      .filter((x) => x && typeof x === 'object' && typeof x.id === 'string')
      .map((x) => ({ id: x.id, name: String(x.name ?? ''), savedAt: Number(x.savedAt) || 0, state: normalizeTrip(x.state) }))
  } catch {
    return []
  }
}

function saveSnapshotsToStorage(snaps: Snapshot[]) {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps))
  } catch { /* ignore */ }
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

// Read a shared trip (?t=...) once at startup. Before it replaces the working
// trip, the visitor's own trip, checks and saved language are kept as a
// restore point (see share.ts). Then the param is stripped so ordinary
// editing + local persistence resume.
function readUrlBoot(): ReturnType<typeof bootFromSearch> {
  const none = { shared: null, restore: null, resetPacked: false }
  if (typeof window === 'undefined') return none
  try {
    const boot = bootFromSearch(localStorage, window.location.search, readSavedLang(), Date.now())
    if (boot.shared) {
      const params = new URLSearchParams(window.location.search)
      params.delete('t')
      const qs = params.toString()
      window.history.replaceState(
        null, '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
      )
    }
    return boot
  } catch {
    return none
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

const BOOT_LANG = bootLanguage()
const URL_BOOT = readUrlBoot()
const BOOT_STATE: TripState = URL_BOOT.shared?.state ?? loadState()
const BOOT_PACKED: Record<string, boolean> = URL_BOOT.resetPacked ? {} : loadPacked()

// Cookie-free counts (see analytics.ts). Run once per page load, outside React
// so StrictMode's double effects can't double-count.
if (typeof window !== 'undefined') {
  if (URL_BOOT.shared) track('shared_open')
  try { noteVisit(localStorage, new Date()) } catch { /* storage disabled */ }
}

/* ============================================================ COMPONENT ============================================================ */

function App() {
  const [lang, setLang] = useState<Lang>(() => BOOT_LANG.lang)
  const [langSource, setLangSource] = useState<LangSource>(() => BOOT_LANG.source)
  const [days, setDays] = useState<number>(() => BOOT_STATE.days)
  const [gender, setGender] = useState<Gender>(() => BOOT_STATE.gender)
  const [travelerType, setTravelerType] = useState<TravelerType>(() => BOOT_STATE.travelerType)
  const [travelType, setTravelType] = useState<TravelType>(() => BOOT_STATE.travelType)
  const [overrides, setOverrides] = useState<Record<string, number>>(() => BOOT_STATE.overrides)
  const [limitKg, setLimitKg] = useState<BagLimit>(() => BOOT_STATE.limitKg)
  const [worn, setWorn] = useState<string[]>(() => BOOT_STATE.worn)
  const [laundryDays, setLaundryDays] = useState<LaundryDays>(() => BOOT_STATE.laundryDays)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots())
  const [snapshotName, setSnapshotName] = useState('')
  const [packed, setPacked] = useState<Record<string, boolean>>(() => BOOT_PACKED)
  const [restorePoint, setRestorePoint] = useState<RestorePoint | null>(() => URL_BOOT.restore)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const t = TRANSLATIONS[lang]

  const trip: TripState = useMemo(
    () => ({ days, gender, travelerType, travelType, overrides, limitKg, worn, laundryDays }),
    [days, gender, travelerType, travelType, overrides, limitKg, worn, laundryDays],
  )

  // Persist UI state continuously.
  useEffect(() => {
    saveStateToStorage(trip)
  }, [trip])

  // Persist packing progress (kept separate from trip config + snapshots).
  useEffect(() => {
    savePackedToStorage(packed)
  }, [packed])

  // Only an explicit pick from the language switch is remembered.
  const chooseLang = (l: Lang) => {
    if (l !== lang) track('language_change')
    setLang(l)
    setLangSource('saved')
    try { localStorage.setItem(LANG_CHOICE_KEY, l) } catch { /* ignore */ }
    syncLangPath(l)
  }

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dirOf(lang)
    // The static description under the app (index.html) is in the page's
    // language; hide it when the UI is showing a different one.
    const about = document.getElementById('pm-about')
    if (about) about.hidden = about.lang !== lang
  }, [lang])

  const activeItems = useMemo(
    () => resolveItems(gender, travelerType, travelType),
    [gender, travelerType, travelType],
  )

  const defaultQty = (item: ResolvedItem) => suggestedQty(item, trip)
  const getQty = (item: ResolvedItem) => listQty(item, trip)

  const setQty = (item: ResolvedItem, qty: number) =>
    setOverrides((prev) => ({ ...prev, [item.id]: Math.max(0, qty) }))

  const resetItem = (item: ResolvedItem) =>
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })

  const toggleWorn = (id: string) =>
    setWorn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort()))

  // Totals are for the bag: anything worn on the travel day is left out.
  const totals = useMemo(() => computeTotals(activeItems, trip), [activeItems, trip])
  const { weightKg: totalWeight, volumeL: totalVolume, count: totalItems } = totals

  // The verdict must pass BOTH weight (against the chosen limit) and volume.
  const verdict = useMemo(
    () => chooseLuggage(totalWeight, totalVolume, limitKg),
    [totalWeight, totalVolume, limitKg],
  )
  const luggageEmoji = LUGGAGE_EMOJI[verdict.nameKey]
  const cabinLimit = isCabinLimit(limitKg)
  const cabinCapKg = Math.min(limitKg, CABIN_MAX_KG)

  const warnings: Warning[] = useMemo(() => {
    const w: Warning[] = []
    if (verdict.overLimit)
      w.push({ type: 'over', msg: t.warnings.overLimit(totalWeight.toFixed(1), limitKg, verdict.overByKg.toFixed(1)) })
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
  }, [activeItems, trip, totalWeight, totalVolume, verdict, lang])

  const volumePct = Math.min(100, (totalVolume / 70) * 100)
  // Scale the weight gauge so the chosen limit sits at 80% of the track.
  const weightScale = limitKg * 1.25
  const weightPct = Math.min(100, (totalWeight / weightScale) * 100)

  const usedCategoriesCount = useMemo(
    () => CATEGORY_ORDER.filter((c) => activeItems.some((i) => i.category === c)).length,
    [activeItems],
  )

  // Packing progress counts only units that actually go in the bag: an item
  // you wear (and have no spare of) is not "packable" and never counts as packed.
  const { packedCount, packableCount } = useMemo(() => {
    let packableCount = 0
    let packedCount = 0
    for (const it of activeItems) {
      if (bagQty(it, trip) <= 0) continue
      packableCount++
      if (packed[it.id]) packedCount++
    }
    return { packedCount, packableCount }
  }, [activeItems, trip, packed])

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

  const togglePacked = (id: string) => {
    const next = { ...packed, [id]: !packed[id] }
    setPacked(next)
    if (next[id]) {
      const checked = activeItems.filter((it) => next[it.id] && bagQty(it, trip) > 0).length
      if (checked >= 1) trackOncePerPage('first_check')
      if (checked >= 5) trackOncePerPage('five_checks')
    }
  }

  const clearPacked = () => setPacked({})

  async function shareTrip() {
    // The link opens the sender's language entry page; a recipient's own saved
    // language still wins (see lang.ts).
    const url = `${window.location.origin}${LANG_PATH[lang]}?t=${encodeTrip(trip)}`
    if (await copyText(url)) {
      track('share')
      setShareStatus('copied')
      window.setTimeout(() => setShareStatus('idle'), 2000)
    }
  }

  const printList = () => {
    track('print')
    window.print()
  }

  /* -------------------- snapshot handlers -------------------- */

  function saveSnapshot() {
    const name = snapshotName.trim() || autoSnapshotName()
    const snap: Snapshot = {
      id: uid(),
      name,
      savedAt: now(),
      state: trip,
    }
    const next = [snap, ...snapshots].slice(0, 20)
    setSnapshots(next)
    saveSnapshotsToStorage(next)
    setSnapshotName('')
    track('save')
  }

  function autoSnapshotName(): string {
    const tt = t.travelTypes[travelType].name
    const tr = t.travelers[travelerType].name
    return `${tt} · ${tr} · ${days}${DAY_SUFFIX[lang]}`
  }

  function applyTrip(s: TripState) {
    setDays(s.days)
    setGender(s.gender)
    setTravelerType(s.travelerType)
    setTravelType(s.travelType)
    setOverrides(s.overrides)
    setLimitKg(s.limitKg)
    setWorn(s.worn)
    setLaundryDays(s.laundryDays)
  }

  function loadSnapshot(snap: Snapshot) {
    applyTrip(snap.state)
    track('load')
  }

  /* -------------------- shared-link restore -------------------- */

  function restoreOwnTrip() {
    if (!restorePoint) return
    applyTrip(restorePoint.state)
    setPacked(restorePoint.packed)
    if (restorePoint.lang) {
      setLang(restorePoint.lang)
      setLangSource('saved')
    }
    clearRestorePoint(localStorage)
    setRestorePoint(null)
  }

  function keepSharedTrip() {
    clearRestorePoint(localStorage)
    setRestorePoint(null)
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
            <LanguagePicker
              lang={lang}
              onChange={chooseLang}
              label={t.language}
              fallbackNote={langSource === 'fallback'}
            />
            <div className="pm-kpis">
              <Kpi label={t.kpi.items}  value={String(totalItems)} accent />
              <Kpi
                label={t.kpi.weight}
                value={`${totalWeight.toFixed(2)} ${t.units.kg}`}
                note={totals.wornCount > 0 ? t.kpi.worn(totals.wornWeightKg.toFixed(2)) : undefined}
              />
              <Kpi label={t.kpi.volume} value={`${totalVolume.toFixed(2)} ${t.units.l}`} />
            </div>
          </div>
        </header>

        {restorePoint && (
          <section className="pm-restore" aria-live="polite">
            <span className="pm-alert-icon" aria-hidden>🔗</span>
            <span className="pm-restore-text">
              <b>{t.share.openedTitle}</b> {t.share.openedBody}
            </span>
            <span className="pm-restore-actions">
              <button type="button" className="pm-btn pm-btn-sm pm-btn-primary" onClick={restoreOwnTrip}>
                ↩ {t.share.restore}
              </button>
              <button type="button" className="pm-btn pm-btn-sm" onClick={keepSharedTrip}>
                {t.share.keep}
              </button>
            </span>
          </section>
        )}

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

          <div className="pm-control pm-control-span-2">
            <div className="pm-control-head">
              <span className="pm-label" id="pm-laundry-label">{t.controls.laundry}</span>
              <span className="pm-pill pm-pill-muted">{t.controls.laundryHint}</span>
            </div>
            <div className="pm-chips" role="group" aria-labelledby="pm-laundry-label">
              {LAUNDRY_OPTIONS.map((n) => {
                const active = laundryDays === n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLaundryDays(n)}
                    className={`pm-chip ${active ? 'pm-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span aria-hidden>🧺</span> {t.controls.laundryEvery(n)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pm-control pm-control-span-2">
            <div className="pm-control-head">
              <span className="pm-label" id="pm-limit-label">{t.controls.bagLimit}</span>
              <span className="pm-pill pm-pill-muted">{t.controls.bagLimitHint}</span>
            </div>
            <div className="pm-chips" role="group" aria-labelledby="pm-limit-label">
              {BAG_LIMITS.map((kg) => {
                const active = limitKg === kg
                return (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => setLimitKg(kg)}
                    className={`pm-chip ${active ? 'pm-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span aria-hidden>{isCabinLimit(kg) ? '🧳' : '🧰'}</span>
                    {' '}{isCabinLimit(kg) ? t.controls.cabin : t.controls.hold} {kg} {t.units.kg}
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
              const catQty = itemsInCat.reduce((sum, it) => sum + bagQty(it, trip), 0)
              const catWeight = itemsInCat.reduce((sum, it) => sum + bagQty(it, trip) * it.weightKg, 0)
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
                      const wornN = wornQty(it, trip)
                      const inBag = qty - wornN
                      const isWorn = wornN > 0
                      // Nothing left to pack once the only unit is worn.
                      const allWorn = isWorn && inBag === 0
                      const isPacked = !!packed[it.id] && !allWorn
                      const isZero = qty === 0
                      return (
                        <li
                          key={it.id}
                          className={[
                            'pm-item',
                            isZero ? 'pm-item-zero' : '',
                            allWorn ? 'pm-item-worn' : '',
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
                          ) : allWorn ? (
                            <span className="pm-check-worn" aria-hidden title={t.list.worn}>
                              ✓
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
                              {(inBag * it.weightKg).toFixed(2)} {t.units.kg}
                              <span className="pm-dot">•</span>
                              {(inBag * it.volumeL).toFixed(2)} {t.units.l}
                              {isWorn && (
                                <>
                                  <span className="pm-dot">•</span>
                                  <span className="pm-worn-note">{wornN} {t.list.wornNote}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="pm-qty">
                            {it.wearable && qty > 0 && (
                              <button
                                type="button"
                                className={`pm-btn pm-btn-sm pm-wear ${isWorn ? 'pm-wear-on' : ''}`}
                                onClick={() => toggleWorn(it.id)}
                                aria-pressed={isWorn}
                                aria-label={t.list.wearAria(itemName)}
                                title={t.list.wearAria(itemName)}
                              >
                                {isWorn ? `✓ ${t.list.worn}` : t.list.wear}
                              </button>
                            )}
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
                  { at: (BACKPACK_MAX_L / 70) * 100, label: `${BACKPACK_MAX_L}L` },
                  { at: (CARRY_ON_MAX_L / 70) * 100, label: `${CARRY_ON_MAX_L}L` },
                ]}
              />
              <Gauge
                label={t.telemetry.weight}
                value={`${totalWeight.toFixed(2)} ${t.units.kg}`}
                pct={weightPct}
                color={verdict.overLimit ? 'var(--pm-danger)' : 'var(--pm-success)'}
                ticks={[
                  ...(!cabinLimit ? [{ at: (CABIN_MAX_KG / weightScale) * 100, label: `${CABIN_MAX_KG}kg` }] : []),
                  { at: (limitKg / weightScale) * 100, label: `${limitKg}kg` },
                ]}
              />
            </div>

            <div className={`pm-card pm-luggage pm-luggage-${verdict.tier}`}>
              <div className="pm-luggage-head">
                <span className="pm-muted pm-uppercase">{t.luggage.title}</span>
                <span className="pm-pill pm-pill-muted">{t.luggage.tier(verdict.tier)}</span>
              </div>
              <div className="pm-luggage-body">
                <div className="pm-luggage-emoji" aria-hidden>{luggageEmoji}</div>
                <div>
                  <div className="pm-luggage-name">{t.luggage[verdict.nameKey]}</div>
                  <div className="pm-muted">
                    {verdict.tier === 1 && t.luggage.capacityUpTo(BACKPACK_MAX_L)}
                    {verdict.tier === 2 && t.luggage.capacityBetween(BACKPACK_MAX_L, CARRY_ON_MAX_L)}
                    {verdict.tier === 3 && t.luggage.capacityOver(CARRY_ON_MAX_L)}
                    {' · '}
                    {cabinLimit ? t.controls.cabin : t.controls.hold} {limitKg} {t.units.kg}
                  </div>
                  {verdict.cabinBlockedBy && (
                    <div className={`pm-luggage-why ${verdict.overLimit ? 'pm-luggage-why-bad' : ''}`}>
                      {verdict.cabinBlockedBy === 'weight' && t.luggage.blockedWeight(cabinCapKg)}
                      {verdict.cabinBlockedBy === 'volume' && t.luggage.blockedVolume(CARRY_ON_MAX_L)}
                      {verdict.cabinBlockedBy === 'both' && t.luggage.blockedBoth(cabinCapKg, CARRY_ON_MAX_L)}
                    </div>
                  )}
                </div>
              </div>
              <div className="pm-luggage-bar" aria-hidden>
                <div className={`pm-luggage-seg ${verdict.tier >= 1 ? 'on' : ''}`}>{t.luggage.barBackpack}</div>
                <div className={`pm-luggage-seg ${verdict.tier >= 2 ? 'on' : ''}`}>{t.luggage.barCarryOn}</div>
                <div className={`pm-luggage-seg ${verdict.tier >= 3 ? 'on' : ''}`}>{t.luggage.barSuitcase}</div>
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

function Kpi({ label, value, note, accent = false }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div className={`pm-kpi ${accent ? 'pm-kpi-accent' : ''}`}>
      <div className="pm-kpi-value">{value}</div>
      <div className="pm-kpi-label">{label}</div>
      {note && <div className="pm-kpi-note">{note}</div>}
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
  fallbackNote = false,
}: {
  lang: Lang
  onChange: (l: Lang) => void
  label: string
  /** None of the browser's languages is supported: say so, plainly, in English. */
  fallbackNote?: boolean
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
      {fallbackNote && !open && (
        <p className="pm-lang-note" lang="en" dir="ltr">
          Language: English -{' '}
          <button type="button" className="pm-lang-note-btn" onClick={() => setOpen(true)}>
            change
          </button>
        </p>
      )}
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
.pm-lang-note { margin: 6px 4px 0; font-size: 12px; color: var(--pm-muted); text-align: end; }
.pm-lang-note-btn {
  background: none; border: 0; padding: 0; font: inherit; cursor: pointer;
  color: var(--pm-accent-strong); text-decoration: underline; text-underline-offset: 2px;
}
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

/* ========== shared-link restore ========== */
.pm-restore {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  border: 1px solid color-mix(in srgb, var(--pm-accent) 45%, transparent);
  background: var(--pm-accent-bg);
  border-radius: 14px; padding: 12px 16px; margin-bottom: 16px;
  font-size: 14px;
}
.pm-restore-text { flex: 1; min-width: 200px; }
.pm-restore-actions { display: inline-flex; gap: 6px; flex-wrap: wrap; }
@media print { .pm-restore { display: none !important; } }

/* ========== worn on the travel day ========== */
.pm-kpi-note { font-size: 11px; color: var(--pm-muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
.pm-kpi-accent .pm-kpi-note { color: rgba(255,255,255,.85); }
.pm-wear { white-space: nowrap; }
.pm-wear-on { background: var(--pm-accent-bg); color: var(--pm-accent-strong); border-color: var(--pm-accent); }
.pm-worn-note { color: var(--pm-accent-strong); font-weight: 600; }
.pm-item-worn { opacity: .7; }
.pm-check-worn {
  width: 22px; height: 22px; flex-shrink: 0;
  display: grid; place-items: center; font-size: 13px; font-weight: 800; line-height: 1;
  color: var(--pm-accent-strong);
  border: 1px dashed var(--pm-accent); border-radius: 6px;
}
.pm-luggage-why { font-size: 12.5px; color: var(--pm-text-soft); margin-top: 4px; }
.pm-luggage-why-bad { color: var(--pm-danger); font-weight: 600; }

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
