import { useMemo, useState, type CSSProperties } from 'react'

type Gender = 'male' | 'female'

type Category =
  | 'Documents & Money'
  | 'Electronics'
  | 'Clothing'
  | 'Outerwear'
  | 'Footwear'
  | 'Toiletries'
  | 'Health & Comfort'
  | 'Travel Extras'

interface PackItem {
  id: string
  name: string
  emoji: string
  category: Category
  /** Per-day multiplier for scaling items. 0 for fixed items. */
  basePerDay: number
  weightKg: number
  volumeL: number
  /** Fixed items always default to a quantity of 1 regardless of trip length. */
  fixed: boolean
  gender?: Gender
  /** Essential items trigger an under-packing warning when set to 0. */
  essential?: boolean
}

const CATEGORY_ORDER: Category[] = [
  'Documents & Money',
  'Electronics',
  'Clothing',
  'Outerwear',
  'Footwear',
  'Toiletries',
  'Health & Comfort',
  'Travel Extras',
]

const CATEGORY_EMOJI: Record<Category, string> = {
  'Documents & Money': '📑',
  'Electronics': '🔌',
  'Clothing': '👕',
  'Outerwear': '🧥',
  'Footwear': '👟',
  'Toiletries': '🧼',
  'Health & Comfort': '💊',
  'Travel Extras': '🌍',
}

const ITEMS: PackItem[] = [
  // Documents & Money
  { id: 'passport',     name: 'Passport',              emoji: '📔', category: 'Documents & Money', basePerDay: 0, weightKg: 0.05, volumeL: 0.10, fixed: true, essential: true },
  { id: 'wallet',       name: 'Wallet',                emoji: '👛', category: 'Documents & Money', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true, essential: true },
  { id: 'id-card',      name: 'ID Card',               emoji: '🪪', category: 'Documents & Money', basePerDay: 0, weightKg: 0.01, volumeL: 0.02, fixed: true, essential: true },
  { id: 'cash-cards',   name: 'Cash & Cards',          emoji: '💳', category: 'Documents & Money', basePerDay: 0, weightKg: 0.03, volumeL: 0.05, fixed: true, essential: true },
  { id: 'insurance',    name: 'Travel Insurance Docs', emoji: '📄', category: 'Documents & Money', basePerDay: 0, weightKg: 0.02, volumeL: 0.05, fixed: true },

  // Electronics
  { id: 'phone',          name: 'Phone',          emoji: '📱', category: 'Electronics', basePerDay: 0, weightKg: 0.20, volumeL: 0.15, fixed: true, essential: true },
  { id: 'charger',        name: 'Phone Charger',  emoji: '🔌', category: 'Electronics', basePerDay: 0, weightKg: 0.12, volumeL: 0.30, fixed: true, essential: true },
  { id: 'power-adapter',  name: 'Power Adapter',  emoji: '🔋', category: 'Electronics', basePerDay: 0, weightKg: 0.15, volumeL: 0.25, fixed: true },
  { id: 'headphones',     name: 'Headphones',     emoji: '🎧', category: 'Electronics', basePerDay: 0, weightKg: 0.25, volumeL: 0.60, fixed: true },
  { id: 'laptop',         name: 'Laptop',         emoji: '💻', category: 'Electronics', basePerDay: 0, weightKg: 1.50, volumeL: 2.00, fixed: true },
  { id: 'laptop-charger', name: 'Laptop Charger', emoji: '⚡', category: 'Electronics', basePerDay: 0, weightKg: 0.40, volumeL: 0.50, fixed: true },
  { id: 'camera',         name: 'Camera',         emoji: '📷', category: 'Electronics', basePerDay: 0, weightKg: 0.60, volumeL: 1.00, fixed: true },

  // Clothing (scaling with days)
  { id: 'tshirts',   name: 'T-Shirts',     emoji: '👕', category: 'Clothing', basePerDay: 1,    weightKg: 0.18, volumeL: 0.60, fixed: false, essential: true },
  { id: 'underwear', name: 'Underwear',    emoji: '🩲', category: 'Clothing', basePerDay: 1,    weightKg: 0.05, volumeL: 0.15, fixed: false, essential: true },
  { id: 'socks',     name: 'Socks',        emoji: '🧦', category: 'Clothing', basePerDay: 1,    weightKg: 0.06, volumeL: 0.20, fixed: false, essential: true },
  { id: 'pants',     name: 'Pants / Jeans',emoji: '👖', category: 'Clothing', basePerDay: 0.34, weightKg: 0.55, volumeL: 1.20, fixed: false },
  { id: 'pajamas',   name: 'Pajamas',      emoji: '🛌', category: 'Clothing', basePerDay: 0,    weightKg: 0.30, volumeL: 0.70, fixed: true },
  { id: 'swimwear',  name: 'Swimwear',     emoji: '🩳', category: 'Clothing', basePerDay: 0,    weightKg: 0.15, volumeL: 0.30, fixed: true },

  // Outerwear
  { id: 'sweater',      name: 'Sweater / Hoodie', emoji: '🧶', category: 'Outerwear', basePerDay: 0, weightKg: 0.50, volumeL: 1.80, fixed: true },
  { id: 'jacket',       name: 'Heavy Jacket',     emoji: '🧥', category: 'Outerwear', basePerDay: 0, weightKg: 0.90, volumeL: 3.50, fixed: true },
  { id: 'rain-jacket',  name: 'Rain Jacket',      emoji: '☔', category: 'Outerwear', basePerDay: 0, weightKg: 0.30, volumeL: 0.80, fixed: true },

  // Footwear
  { id: 'sneakers',     name: 'Sneakers',           emoji: '👟', category: 'Footwear', basePerDay: 0, weightKg: 0.80, volumeL: 2.50, fixed: true, essential: true },
  { id: 'sandals',      name: 'Sandals / Flip-flops', emoji: '🩴', category: 'Footwear', basePerDay: 0, weightKg: 0.30, volumeL: 1.00, fixed: true },
  { id: 'dress-shoes',  name: 'Dress Shoes',        emoji: '👞', category: 'Footwear', basePerDay: 0, weightKg: 0.70, volumeL: 2.00, fixed: true },

  // Toiletries
  { id: 'toothbrush',  name: 'Toothbrush',           emoji: '🪥', category: 'Toiletries', basePerDay: 0, weightKg: 0.02, volumeL: 0.05, fixed: true, essential: true },
  { id: 'toothpaste',  name: 'Toothpaste',           emoji: '🧴', category: 'Toiletries', basePerDay: 0, weightKg: 0.10, volumeL: 0.15, fixed: true },
  { id: 'soap',        name: 'Soap & Body Wash',     emoji: '🧼', category: 'Toiletries', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true },
  { id: 'shampoo',     name: 'Shampoo & Conditioner',emoji: '🧴', category: 'Toiletries', basePerDay: 0, weightKg: 0.20, volumeL: 0.25, fixed: true },
  { id: 'deodorant',   name: 'Deodorant',            emoji: '🌬️', category: 'Toiletries', basePerDay: 0, weightKg: 0.10, volumeL: 0.15, fixed: true },
  { id: 'sunscreen',   name: 'Sunscreen',            emoji: '🧴', category: 'Toiletries', basePerDay: 0, weightKg: 0.15, volumeL: 0.20, fixed: true },
  { id: 'chapstick',   name: 'Chapstick',            emoji: '💋', category: 'Toiletries', basePerDay: 0, weightKg: 0.02, volumeL: 0.04, fixed: true },
  { id: 'shaving',     name: 'Shaving Kit',          emoji: '🪒', category: 'Toiletries', basePerDay: 0, weightKg: 0.35, volumeL: 0.80, fixed: true, gender: 'male' },
  { id: 'makeup',      name: 'Makeup & Hygiene Kit', emoji: '💄', category: 'Toiletries', basePerDay: 0, weightKg: 0.55, volumeL: 1.20, fixed: true, gender: 'female' },

  // Health & Comfort
  { id: 'medications',  name: 'Medications',         emoji: '💊', category: 'Health & Comfort', basePerDay: 0, weightKg: 0.15, volumeL: 0.30, fixed: true, essential: true },
  { id: 'first-aid',    name: 'First Aid Kit',       emoji: '⛑️', category: 'Health & Comfort', basePerDay: 0, weightKg: 0.25, volumeL: 0.50, fixed: true },
  { id: 'travel-pillow',name: 'Travel Pillow',       emoji: '💺', category: 'Health & Comfort', basePerDay: 0, weightKg: 0.30, volumeL: 2.00, fixed: true },
  { id: 'sleep-mask',   name: 'Eye Mask & Earplugs', emoji: '😴', category: 'Health & Comfort', basePerDay: 0, weightKg: 0.05, volumeL: 0.10, fixed: true },

  // Travel Extras
  { id: 'water-bottle', name: 'Reusable Water Bottle', emoji: '💧', category: 'Travel Extras', basePerDay: 0, weightKg: 0.15, volumeL: 0.70, fixed: true },
  { id: 'book',         name: 'Book / E-Reader',       emoji: '📖', category: 'Travel Extras', basePerDay: 0, weightKg: 0.30, volumeL: 0.50, fixed: true },
  { id: 'sunglasses',   name: 'Sunglasses',            emoji: '🕶️', category: 'Travel Extras', basePerDay: 0, weightKg: 0.05, volumeL: 0.20, fixed: true },
  { id: 'day-backpack', name: 'Day Backpack (folded)', emoji: '🎒', category: 'Travel Extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },
  { id: 'umbrella',     name: 'Compact Umbrella',     emoji: '☂️', category: 'Travel Extras', basePerDay: 0, weightKg: 0.40, volumeL: 1.00, fixed: true },
]

interface Warning {
  type: 'over' | 'under'
  msg: string
}

interface Luggage {
  name: string
  emoji: string
  capacity: string
  tier: 1 | 2 | 3
}

function App() {
  const [days, setDays] = useState(7)
  const [gender, setGender] = useState<Gender>('male')
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  const activeItems = useMemo(
    () => ITEMS.filter((it) => !it.gender || it.gender === gender),
    [gender],
  )

  const defaultQty = (item: PackItem) =>
    item.fixed ? 1 : Math.max(1, Math.ceil(item.basePerDay * days))

  const getQty = (item: PackItem) =>
    overrides[item.id] ?? defaultQty(item)

  const setQty = (item: PackItem, qty: number) =>
    setOverrides((prev) => ({ ...prev, [item.id]: Math.max(0, qty) }))

  const resetItem = (item: PackItem) =>
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })

  const { totalWeight, totalVolume, totalItems } = useMemo(() => {
    let w = 0
    let v = 0
    let n = 0
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
    if (totalVolume <= 25) return { name: 'Compact Backpack',      emoji: '🎒', capacity: 'up to 25 L', tier: 1 }
    if (totalVolume <= 45) return { name: 'Carry-on Trolley',      emoji: '🧳', capacity: '25 – 45 L',  tier: 2 }
    return                       { name: 'Large Rolling Suitcase', emoji: '🧰', capacity: '45 L +',     tier: 3 }
  }, [totalVolume])

  const warnings: Warning[] = useMemo(() => {
    const w: Warning[] = []
    if (totalWeight > 20) {
      w.push({
        type: 'over',
        msg: `Total weight is ${totalWeight.toFixed(1)} kg — that's over the standard 20 kg airline allowance.`,
      })
    }
    if (totalVolume > 60) {
      w.push({
        type: 'over',
        msg: `Total volume is ${totalVolume.toFixed(1)} L — you're well past carry-on size, consider trimming the list.`,
      })
    }
    for (const it of activeItems) {
      const def = defaultQty(it)
      const qty = getQty(it)
      if (!it.fixed && def > 0 && qty > def * 2) {
        w.push({
          type: 'over',
          msg: `${it.emoji} ${it.name}: packing ${qty} is more than double the suggested ${def}.`,
        })
      }
      if (it.fixed && qty > 3) {
        w.push({
          type: 'over',
          msg: `${it.emoji} ${it.name}: ${qty} feels excessive for a single-item essential.`,
        })
      }
      if (it.essential && qty === 0) {
        w.push({
          type: 'under',
          msg: `${it.emoji} ${it.name} is at 0 — you can't leave home without it!`,
        })
      }
      if (!it.fixed && def >= 2 && qty > 0 && qty < Math.ceil(def / 2)) {
        w.push({
          type: 'under',
          msg: `${it.emoji} ${it.name}: only ${qty} for a ${days}-day trip (suggested ${def}) — you'll run out.`,
        })
      }
    }
    return w
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems, overrides, days, totalWeight, totalVolume])

  const volumePct = Math.min(100, (totalVolume / 70) * 100)
  const weightPct = Math.min(100, (totalWeight / 25) * 100)

  return (
    <>
      <style>{packmateCss}</style>
      <main className="pm-app">
        <header className="pm-header">
          <div className="pm-logo">
            <span className="pm-logo-mark" aria-hidden>🧳</span>
            <div>
              <h1 className="pm-title">PackMate</h1>
              <p className="pm-sub">Smart packing for any trip — powered by math, not vibes.</p>
            </div>
          </div>
          <div className="pm-kpis">
            <Kpi label="Items"  value={String(totalItems)} />
            <Kpi label="Weight" value={`${totalWeight.toFixed(2)} kg`} />
            <Kpi label="Volume" value={`${totalVolume.toFixed(2)} L`} />
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
          <div className="pm-control">
            <div className="pm-control-head">
              <label htmlFor="days" className="pm-label">Trip length</label>
              <span className="pm-pill">{days} {days === 1 ? 'day' : 'days'}</span>
            </div>
            <input
              id="days"
              type="range"
              min={1}
              max={21}
              step={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="pm-range"
              style={{
                background: `linear-gradient(to right, var(--pm-accent) 0%, var(--pm-accent) ${((days - 1) / 20) * 100}%, var(--pm-track) ${((days - 1) / 20) * 100}%, var(--pm-track) 100%)`,
              }}
            />
            <div className="pm-range-scale">
              <span>1</span><span>7</span><span>14</span><span>21</span>
            </div>
          </div>

          <div className="pm-control">
            <div className="pm-control-head">
              <span className="pm-label">Traveler profile</span>
              <span className="pm-pill pm-pill-muted">shows the matching hygiene kit</span>
            </div>
            <div className="pm-segmented" role="tablist" aria-label="Gender profile">
              <button
                role="tab"
                aria-selected={gender === 'male'}
                className={`pm-seg ${gender === 'male' ? 'pm-seg-active' : ''}`}
                onClick={() => setGender('male')}
                type="button"
              >
                <span aria-hidden>👨</span> Male
              </button>
              <button
                role="tab"
                aria-selected={gender === 'female'}
                className={`pm-seg ${gender === 'female' ? 'pm-seg-active' : ''}`}
                onClick={() => setGender('female')}
                type="button"
              >
                <span aria-hidden>👩</span> Female
              </button>
            </div>
          </div>
        </section>

        <section className="pm-grid">
          <div className="pm-items" aria-label="Packing list">
            <div className="pm-items-head">
              <h2 className="pm-h2">Packing list</h2>
              <span className="pm-muted">
                {activeItems.length} items across {CATEGORY_ORDER.filter((c) => activeItems.some((i) => i.category === c)).length} categories · auto-scaled to {days}d
              </span>
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const itemsInCat = activeItems.filter((it) => it.category === cat)
              if (itemsInCat.length === 0) return null
              const catQty = itemsInCat.reduce((sum, it) => sum + getQty(it), 0)
              const catWeight = itemsInCat.reduce((sum, it) => sum + getQty(it) * it.weightKg, 0)
              return (
                <div key={cat} className="pm-cat">
                  <div className="pm-cat-head">
                    <span className="pm-cat-emoji" aria-hidden>{CATEGORY_EMOJI[cat]}</span>
                    <h3 className="pm-cat-name">{cat}</h3>
                    <span className="pm-cat-meta">
                      {catQty} {catQty === 1 ? 'piece' : 'pieces'} · {catWeight.toFixed(2)} kg
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
                      return (
                        <li
                          key={it.id}
                          className={[
                            'pm-item',
                            overPacked || fixedOverpacked ? 'pm-item-warn' : '',
                            essentialMissing ? 'pm-item-danger' : '',
                            lowOnScaling ? 'pm-item-low' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <div className="pm-item-emoji" aria-hidden>
                            {it.emoji}
                          </div>

                          <div className="pm-item-info">
                            <div className="pm-item-name">
                              {it.name}
                              {it.essential && (
                                <span className="pm-tag pm-tag-essential">essential</span>
                              )}
                              {it.gender && (
                                <span className="pm-tag pm-tag-gender">{it.gender}</span>
                              )}
                            </div>
                            <div className="pm-item-meta">
                              {it.fixed ? (
                                <>{'Fixed item · suggested '}<b>1</b></>
                              ) : (
                                <>
                                  {it.basePerDay === 1
                                    ? '1 / day'
                                    : `${it.basePerDay} / day`}
                                  {' · suggested '}<b>{def}</b>
                                </>
                              )}
                              <span className="pm-dot">•</span>
                              {(qty * it.weightKg).toFixed(2)} kg
                              <span className="pm-dot">•</span>
                              {(qty * it.volumeL).toFixed(2)} L
                            </div>
                          </div>

                          <div className="pm-qty">
                            <button
                              type="button"
                              className="pm-btn pm-btn-round"
                              onClick={() => setQty(it, qty - 1)}
                              disabled={qty <= 0}
                              aria-label={`Decrease ${it.name}`}
                            >
                              −
                            </button>
                            <span className="pm-qty-val" aria-live="polite">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="pm-btn pm-btn-round"
                              onClick={() => setQty(it, qty + 1)}
                              aria-label={`Increase ${it.name}`}
                            >
                              +
                            </button>
                            {overridden && (
                              <button
                                type="button"
                                className="pm-btn pm-btn-link"
                                onClick={() => resetItem(it)}
                                aria-label={`Reset ${it.name}`}
                                title="Reset to suggested"
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
            <div className="pm-card">
              <h2 className="pm-h2">Live telemetry</h2>

              <Gauge
                label="Volume"
                value={`${totalVolume.toFixed(2)} L`}
                pct={volumePct}
                color="var(--pm-accent)"
                ticks={[
                  { at: (25 / 70) * 100, label: '25L' },
                  { at: (45 / 70) * 100, label: '45L' },
                ]}
              />

              <Gauge
                label="Weight"
                value={`${totalWeight.toFixed(2)} kg`}
                pct={weightPct}
                color={totalWeight > 20 ? 'var(--pm-danger)' : 'var(--pm-success)'}
                ticks={[{ at: (20 / 25) * 100, label: '20kg' }]}
              />
            </div>

            <div className={`pm-card pm-luggage pm-luggage-${luggage.tier}`}>
              <div className="pm-luggage-head">
                <span className="pm-muted pm-uppercase">Recommended luggage</span>
                <span className="pm-pill pm-pill-muted">tier {luggage.tier}/3</span>
              </div>
              <div className="pm-luggage-body">
                <div className="pm-luggage-emoji" aria-hidden>{luggage.emoji}</div>
                <div>
                  <div className="pm-luggage-name">{luggage.name}</div>
                  <div className="pm-muted">Fits {luggage.capacity}</div>
                </div>
              </div>
              <div className="pm-luggage-bar" aria-hidden>
                <div className={`pm-luggage-seg ${luggage.tier >= 1 ? 'on' : ''}`}>Backpack</div>
                <div className={`pm-luggage-seg ${luggage.tier >= 2 ? 'on' : ''}`}>Carry-on</div>
                <div className={`pm-luggage-seg ${luggage.tier >= 3 ? 'on' : ''}`}>Suitcase</div>
              </div>
            </div>
          </aside>
        </section>

        <footer className="pm-footer">
          <span className="pm-muted">PackMate · v1.0 · Pack light, travel far.</span>
        </footer>
      </main>
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-kpi">
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
  const barStyle: CSSProperties = {
    width: `${pct}%`,
    background: color,
  }
  return (
    <div className="pm-gauge">
      <div className="pm-gauge-head">
        <span className="pm-muted">{label}</span>
        <span className="pm-gauge-value" style={{ color }}>{value}</span>
      </div>
      <div className="pm-gauge-track">
        <div className="pm-gauge-fill" style={barStyle} />
        {ticks.map((t, i) => (
          <span
            key={i}
            className="pm-gauge-tick"
            style={{ left: `${t.at}%` }}
            title={t.label}
          >
            <span className="pm-gauge-tick-label">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const packmateCss = `
.pm-app {
  --pm-accent: #6366f1;
  --pm-accent-strong: #4f46e5;
  --pm-accent-bg: #eef2ff;
  --pm-text: #0f172a;
  --pm-muted: #64748b;
  --pm-card: #ffffff;
  --pm-bg: #f8fafc;
  --pm-border: #e2e8f0;
  --pm-track: #e2e8f0;
  --pm-danger: #dc2626;
  --pm-danger-bg: #fef2f2;
  --pm-warn: #d97706;
  --pm-warn-bg: #fffbeb;
  --pm-success: #16a34a;
  --pm-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.08);

  box-sizing: border-box;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  text-align: left;
  color: var(--pm-text);
  font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0;
}
.pm-app *, .pm-app *::before, .pm-app *::after { box-sizing: border-box; }

@media (prefers-color-scheme: dark) {
  .pm-app {
    --pm-accent: #818cf8;
    --pm-accent-strong: #a5b4fc;
    --pm-accent-bg: rgba(129,140,248,.12);
    --pm-text: #f1f5f9;
    --pm-muted: #94a3b8;
    --pm-card: #1e1f29;
    --pm-bg: #16171d;
    --pm-border: #2e303a;
    --pm-track: #2e303a;
    --pm-danger: #f87171;
    --pm-danger-bg: rgba(248,113,113,.10);
    --pm-warn: #fbbf24;
    --pm-warn-bg: rgba(251,191,36,.10);
    --pm-success: #4ade80;
    --pm-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px -8px rgba(0,0,0,.4);
  }
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.pm-logo { display: flex; align-items: center; gap: 16px; }
.pm-logo-mark {
  width: 56px; height: 56px;
  display: grid; place-items: center;
  font-size: 30px;
  border-radius: 16px;
  background: var(--pm-accent-bg);
  border: 1px solid var(--pm-border);
}
.pm-title {
  font-size: 32px;
  line-height: 1.1;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: var(--pm-text);
}
.pm-sub { color: var(--pm-muted); margin: 4px 0 0; font-size: 14px; }

.pm-kpis { display: flex; gap: 12px; flex-wrap: wrap; }
.pm-kpi {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  padding: 10px 16px;
  min-width: 96px;
  text-align: right;
  box-shadow: var(--pm-shadow);
}
.pm-kpi-value { font-size: 18px; font-weight: 600; color: var(--pm-text); }
.pm-kpi-label {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--pm-muted); margin-top: 2px;
}

.pm-warnings { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.pm-alert {
  display: flex; align-items: flex-start; gap: 10px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  background: var(--pm-card);
}
.pm-alert-over   { background: var(--pm-warn-bg);   border-color: color-mix(in srgb, var(--pm-warn) 30%, transparent); color: var(--pm-text); }
.pm-alert-under  { background: var(--pm-danger-bg); border-color: color-mix(in srgb, var(--pm-danger) 40%, transparent); color: var(--pm-text); }
.pm-alert-icon { font-size: 18px; line-height: 1.2; }

.pm-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.pm-control {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--pm-shadow);
}
.pm-control-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.pm-label { font-weight: 600; color: var(--pm-text); font-size: 15px; }
.pm-pill {
  background: var(--pm-accent-bg);
  color: var(--pm-accent-strong);
  font-weight: 600;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 999px;
}
.pm-pill-muted { background: transparent; color: var(--pm-muted); border: 1px solid var(--pm-border); font-weight: 500; }

.pm-range {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 6px; border-radius: 999px;
  outline: none; cursor: pointer;
}
.pm-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--pm-card);
  border: 3px solid var(--pm-accent);
  box-shadow: 0 2px 6px rgba(99,102,241,.4);
  cursor: grab;
  transition: transform .15s ease;
}
.pm-range::-webkit-slider-thumb:active { transform: scale(1.15); cursor: grabbing; }
.pm-range::-moz-range-thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--pm-card); border: 3px solid var(--pm-accent);
  box-shadow: 0 2px 6px rgba(99,102,241,.4); cursor: grab;
}
.pm-range-scale {
  display: flex; justify-content: space-between;
  margin-top: 8px; color: var(--pm-muted); font-size: 12px;
}

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
  box-shadow: var(--pm-shadow);
}

.pm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}
.pm-items {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--pm-shadow);
}
.pm-items-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 12px;
}
.pm-h2 { margin: 0; font-size: 18px; color: var(--pm-text); font-weight: 600; letter-spacing: -0.2px; }
.pm-muted { color: var(--pm-muted); font-size: 13px; }
.pm-uppercase { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }

.pm-cat { margin-top: 18px; }
.pm-cat:first-of-type { margin-top: 4px; }
.pm-cat-head {
  display: flex; align-items: center; gap: 10px;
  padding: 0 4px 8px;
  border-bottom: 1px dashed var(--pm-border);
  margin-bottom: 10px;
}
.pm-cat-emoji {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  font-size: 16px;
  background: var(--pm-accent-bg);
  border-radius: 8px;
}
.pm-cat-name {
  margin: 0; flex: 1;
  font-size: 13px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pm-text);
}
.pm-cat-meta {
  font-size: 12px; color: var(--pm-muted);
  font-variant-numeric: tabular-nums;
}

.pm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pm-item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 14px; align-items: center;
  padding: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  background: var(--pm-bg);
  transition: border-color .15s ease, background .15s ease;
}
.pm-item:hover { border-color: color-mix(in srgb, var(--pm-accent) 35%, var(--pm-border)); }
.pm-item-warn { border-color: color-mix(in srgb, var(--pm-warn) 50%, transparent); background: var(--pm-warn-bg); }
.pm-item-low { border-color: color-mix(in srgb, var(--pm-warn) 35%, transparent); background: var(--pm-warn-bg); }
.pm-item-danger { border-color: color-mix(in srgb, var(--pm-danger) 50%, transparent); background: var(--pm-danger-bg); }

.pm-item-emoji {
  width: 48px; height: 48px;
  font-size: 26px;
  display: grid; place-items: center;
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 12px;
}
.pm-item-info { min-width: 0; }
.pm-item-name {
  font-weight: 600; color: var(--pm-text);
  font-size: 15px; display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}
.pm-item-meta {
  color: var(--pm-muted); font-size: 12.5px; margin-top: 2px;
  line-height: 1.4;
}
.pm-item-meta b { color: var(--pm-text); font-weight: 600; }
.pm-dot { margin: 0 8px; opacity: .5; }

.pm-tag {
  font-size: 10.5px; font-weight: 600;
  padding: 2px 7px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.pm-tag-essential { background: var(--pm-accent-bg); color: var(--pm-accent-strong); }
.pm-tag-gender { background: var(--pm-bg); color: var(--pm-muted); border: 1px solid var(--pm-border); }

.pm-qty {
  display: inline-flex; align-items: center; gap: 6px;
}
.pm-qty-val {
  min-width: 28px; text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 700; font-size: 15px;
  color: var(--pm-text);
}
.pm-btn {
  border: 1px solid var(--pm-border);
  background: var(--pm-card);
  color: var(--pm-text);
  cursor: pointer;
  font: inherit;
  transition: background .15s ease, border-color .15s ease, color .15s ease, transform .05s ease;
}
.pm-btn:hover:not(:disabled) {
  border-color: var(--pm-accent);
  color: var(--pm-accent-strong);
}
.pm-btn:active:not(:disabled) { transform: scale(.96); }
.pm-btn:disabled { opacity: .4; cursor: not-allowed; }
.pm-btn-round {
  width: 30px; height: 30px;
  border-radius: 50%;
  font-size: 18px; line-height: 1;
  display: grid; place-items: center;
}
.pm-btn-link {
  border: 0; background: transparent; padding: 4px 6px;
  color: var(--pm-muted); font-size: 16px;
}

.pm-summary { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
.pm-card {
  background: var(--pm-card);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--pm-shadow);
}

.pm-gauge { margin-top: 14px; }
.pm-gauge:first-of-type { margin-top: 16px; }
.pm-gauge-head { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.pm-gauge-value { font-weight: 700; font-variant-numeric: tabular-nums; }
.pm-gauge-track {
  position: relative; height: 8px;
  background: var(--pm-track);
  border-radius: 999px; overflow: visible;
}
.pm-gauge-fill {
  height: 100%; border-radius: 999px;
  transition: width .35s cubic-bezier(.4,0,.2,1), background .25s ease;
}
.pm-gauge-tick {
  position: absolute; top: -3px; height: 14px; width: 2px;
  background: var(--pm-muted); opacity: .5; border-radius: 2px;
}
.pm-gauge-tick-label {
  position: absolute; top: 16px; left: 50%;
  transform: translateX(-50%);
  font-size: 10px; color: var(--pm-muted);
  white-space: nowrap;
}

.pm-luggage-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.pm-luggage-body { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.pm-luggage-emoji {
  width: 56px; height: 56px;
  font-size: 30px;
  display: grid; place-items: center;
  background: var(--pm-accent-bg);
  border-radius: 14px;
}
.pm-luggage-name { font-size: 18px; font-weight: 700; color: var(--pm-text); letter-spacing: -0.2px; }

.pm-luggage-bar {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  background: var(--pm-bg); border: 1px solid var(--pm-border);
  border-radius: 10px; overflow: hidden;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.pm-luggage-seg {
  padding: 8px 4px; text-align: center;
  color: var(--pm-muted);
  border-right: 1px solid var(--pm-border);
  transition: background .2s ease, color .2s ease;
}
.pm-luggage-seg:last-child { border-right: 0; }
.pm-luggage-seg.on { background: var(--pm-accent); color: #fff; }

.pm-footer { margin-top: 28px; text-align: center; }

@media (max-width: 820px) {
  .pm-header { align-items: flex-start; }
  .pm-kpis { width: 100%; }
  .pm-kpi { flex: 1; text-align: left; min-width: 0; }
  .pm-controls { grid-template-columns: 1fr; }
  .pm-grid { grid-template-columns: 1fr; }
  .pm-summary { position: static; }
  .pm-item { grid-template-columns: 40px 1fr; grid-template-rows: auto auto; }
  .pm-item-emoji { width: 40px; height: 40px; font-size: 22px; }
  .pm-qty { grid-column: 1 / -1; justify-content: flex-end; }
}
`

export default App
