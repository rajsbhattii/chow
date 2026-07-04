import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfileStats, fetchTasteDNA } from '../data/restaurants'
import type { ProfileStats, TasteDNA } from '../data/restaurants'
import PaletteDna from '../components/PaletteDna'
import api from '../lib/api'

const TABS = ['Stats', 'Badges', 'Taste DNA', 'Settings']

const BADGES: { key: string; label: string; emoji: string; desc: string }[] = [
  { key: 'foodie',              label: 'Foodie',             emoji: '🍴', desc: 'Log 5 visits' },
  { key: 'critic',              label: 'Critic',             emoji: '📝', desc: 'Log 25 visits' },
  { key: 'five_star',           label: 'Five Star',          emoji: '⭐', desc: 'Give a restaurant 5 stars' },
  { key: 'regular',             label: 'Regular',            emoji: '🏠', desc: 'Visit the same spot 5× or more' },
  { key: 'off_the_map',         label: 'Off the Map',        emoji: '📍', desc: 'Visit a restaurant with under 50 reviews' },
  { key: 'hidden_gem',          label: 'Hidden Gem',         emoji: '💎', desc: 'Visit a spot with <200 reviews and 4.5+ stars' },
  { key: 'splurge',             label: 'Splurge',            emoji: '💸', desc: 'Visit a $$$$ restaurant' },
  { key: 'cheap_eats',          label: 'Cheap Eats',         emoji: '🪙', desc: 'Visit 3 restaurants under $' },
  { key: 'neighbourhood_hopper',label: 'Hood Hopper',        emoji: '🗺️', desc: 'Visit restaurants in 3+ neighbourhoods' },
  { key: 'adventurous_eater',   label: 'Adventurous Eater', emoji: '🌶️', desc: 'Visit an Ethiopian, Vietnamese, Thai, or fusion spot' },
  { key: 'brunch_club',         label: 'Brunch Club',        emoji: '🥂', desc: 'Visit a brunch restaurant' },
  { key: 'date_night_pro',      label: 'Date Night Pro',     emoji: '🕯️', desc: 'Visit 3 date night restaurants' },
  { key: 'globe_trotter',       label: 'Globe Trotter',      emoji: '🌍', desc: 'Try 10 different cuisines' },
  { key: 'first_in_line',       label: 'First In Line',      emoji: '🥇', desc: 'Visit a new restaurant within a week of it opening' },
  { key: 'trendsetter',         label: 'Trendsetter',        emoji: '📈', desc: 'Visit before it hits 4.5 stars' },
  { key: 'gambler',             label: 'Gambler',            emoji: '🎲', desc: 'Use Take a Risk 10 times' },
]

const ADVENTURE_LABELS: Record<string, string> = {
  comfort_zone: '🏠 Comfort zone',
  open_minded:  '🚶 Open-minded',
  adventurous:  '🧭 Adventurous',
  full_send:    '🚀 Full send',
}

const CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Indian', 'Chinese',
  'Thai', 'Mediterranean', 'American', 'Korean', 'Ethiopian',
  'French', 'Greek', 'Middle Eastern', 'Vietnamese',
]
const BUDGETS = ['$', '$$', '$$$', '$$$$']
const TRANSPORT = ['Walk', 'Transit', 'Drive']
const DIETARY = ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Nut-free', 'Pescatarian']
const ADVENTURE_LEVELS = [
  { value: 'comfort_zone', emoji: '🏠', label: 'Comfort zone',  desc: 'I know what I like' },
  { value: 'open_minded',  emoji: '🚶', label: 'Open-minded',   desc: 'New things if well-reviewed' },
  { value: 'adventurous',  emoji: '🧭', label: 'Adventurous',   desc: "Surprise me, I'm here for it" },
  { value: 'full_send',    emoji: '🚀', label: 'Full send',     desc: "I want things I've never heard of" },
]

export default function Profile() {
  const [tab, setTab] = useState('Stats')
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [statsYear, setStatsYear] = useState<number | null>(null) // null = all time
  const [dna] = useState<TasteDNA>({
    empty: false,
    total_visits: 15,
    cuisine_breakdown: [
      { cuisine: 'Italian', count: 6, pct: 40 },
      { cuisine: 'Korean', count: 4, pct: 27 },
      { cuisine: 'Indian', count: 2, pct: 13 },
      { cuisine: 'Thai', count: 1, pct: 7 },
      { cuisine: 'Brunch', count: 1, pct: 7 },
      { cuisine: 'Ethiopian', count: 1, pct: 6 },
    ],
    price_breakdown: [
      { tier: 2, label: '$$', count: 11, pct: 73 },
      { tier: 3, label: '$$$', count: 3, pct: 20 },
      { tier: 4, label: '$$$$', count: 1, pct: 7 },
    ],
    top_neighbourhoods: [
      { name: 'Distillery District', count: 5 },
      { name: 'Annex', count: 4 },
      { name: 'Kensington Market', count: 3 },
      { name: 'Yorkville', count: 2 },
      { name: 'Liberty Village', count: 1 },
    ],
    avg_rating_given: 4.4,
    most_visited: [
      { name: 'Piano Piano', count: 4, emoji: '🍝' },
      { name: 'Pai Northern Thai', count: 3, emoji: '🍜' },
      { name: 'Miku Toronto', count: 2, emoji: '🍣' },
    ],
    would_return_breakdown: { definitely: 12, maybe: 3 },
  })

  // Settings state — seeded from user once loaded
  const [settingsName, setSettingsName]           = useState('')
  const [settingsCuisines, setSettingsCuisines]   = useState<string[]>([])
  const [settingsBudget, setSettingsBudget]         = useState('$$')
  const [settingsDistance, setSettingsDistance]     = useState(10)
  const [settingsTransport, setSettingsTransport]   = useState<string[]>([])
  const [settingsAdventure, setSettingsAdventure]   = useState('open_minded')
  const [settingsDietary, setSettingsDietary]       = useState<string[]>([])
  const [saving, setSaving]                         = useState(false)
  const [saveSuccess, setSaveSuccess]               = useState(false)

  useEffect(() => {
    setStats(null)
    fetchProfileStats(statsYear ?? undefined).then(setStats).catch(() => {})
  }, [statsYear])


  useEffect(() => {
    if (!user) return
    setSettingsName(user.name ?? '')
    setSettingsCuisines(user.cuisine_preferences ?? [])
    setSettingsBudget(user.budget_range ?? '$$')
    setSettingsDistance(user.max_distance ?? 10)
    setSettingsTransport(user.transport_modes ?? [])
    setSettingsAdventure(user.adventure_level ?? 'open_minded')
    setSettingsDietary(user.dietary_needs ?? [])
  }, [user])

  async function saveSettings() {
    setSaving(true)
    try {
      const { data } = await api.patch('/api/auth/me', {
        name: settingsName,
        cuisine_preferences: settingsCuisines,
        budget_range: settingsBudget,
        max_distance_km: settingsDistance,
        transport_modes: settingsTransport,
        adventure_level: settingsAdventure,
        dietary_needs: settingsDietary,
      })
      updateUser(data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      // silently ignore for now
    } finally {
      setSaving(false)
    }
  }

  function toggleList<T>(list: T[], setList: (v: T[]) => void, item: T) {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  function handleSignOut() {
    logout()
    navigate('/', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const currentYear = new Date().getFullYear()
  const yearTabs: (number | null)[] = [null, currentYear]
  const earnedBadges = new Set(stats?.badges_earned ?? [])

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {user?.name ?? 'Your Name'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>
            {user?.email ?? 'you@example.com'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--orange)' : 'transparent'}`,
              color: tab === t ? 'var(--orange)' : 'var(--text-3)',
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Stats' && (
        <>
          {/* Year tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {yearTabs.map(y => {
              const active = statsYear === y
              return (
                <button
                  key={y ?? 'all'}
                  onClick={() => setStatsYear(y)}
                  style={{
                    padding: '5px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                    border: active ? '1.5px solid var(--orange)' : '1px solid var(--border)',
                    background: active ? 'var(--orange)' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--text-3)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {y === null ? 'All time' : y}
                </button>
              )
            })}
          </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
          {/* Big visits card */}
          <div style={{
            background: 'var(--surface-inverse)', borderRadius: 16, padding: '32px 28px',
            color: '#fff', width: 220, flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {statsYear === null ? 'All time' : statsYear === currentYear ? `Your ${currentYear} so far` : `Your ${statsYear}`}
            </p>
            <div>
              <p style={{
                fontSize: (() => {
                  const v = String(stats?.visits ?? '—')
                  if (v.length <= 1) return 96
                  if (v.length === 2) return 80
                  if (v.length === 3) return 64
                  return 48
                })(),
                fontWeight: 900, lineHeight: 1, color: '#fff', transition: 'font-size 0.2s ease',
              }}>
                {stats?.visits ?? '—'}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                restaurants visited
              </p>
            </div>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
            {[
              { label: 'Total swipes',       value: stats?.swipes          ?? '—' },
              { label: 'Restaurants saved',  value: stats?.saves            ?? '—' },
              { label: 'Cuisines tried',     value: stats?.cuisines_tried   ?? '—' },
              { label: 'Adventure score',    value: stats?.adventure_score ? ADVENTURE_LABELS[stats.adventure_score] : '—' },
              { label: 'Favourite cuisine',  value: stats?.favourite_cuisine ?? '—' },
              { label: 'Favourite vibe',     value: stats?.favourite_vibe    ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ padding: '24px 22px' }}>
                <p style={{
                  fontSize: typeof value === 'string' && value.length > 6 ? 18 : 36,
                  fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                }}>
                  {value}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {tab === 'Badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {BADGES.map(({ key, label, emoji, desc }) => {
            const earned = earnedBadges.has(key)
            return (
              <div
                key={key}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '28px 16px', textAlign: 'center',
                  opacity: earned ? 1 : 0.35,
                  borderColor: earned ? 'var(--orange)' : 'var(--border)',
                  position: 'relative',
                }}
              >
                {earned && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 800 }}>✓</span>
                  </div>
                )}
                <span style={{ fontSize: 36 }}>{emoji}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.4 }}>{desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Taste DNA' && (
        !dna ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : dna.empty ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center', gap: 14, borderStyle: 'dashed' }}>
            <span style={{ fontSize: 52 }}>🧬</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Your Taste DNA</p>
            <p style={{ fontSize: 14, color: 'var(--text-4)' }}>Log some visits to unlock your cuisine profile.</p>
          </div>
        ) : (() => {
          const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#C3A6FF']
          const PRICE_COLORS: Record<number, string> = { 1: '#4ECDC4', 2: '#45B7D1', 3: '#FF9F43', 4: '#FF6B6B' }

          const cuisineEntries = dna.cuisine_breakdown.map(({ cuisine, pct }, i) => ({
            name: cuisine,
            color: PALETTE[i % PALETTE.length],
            pct,
          }))

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Row: Your palate (75%) | Most visited (25%) */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>

                {/* Your palate — 3D DNA helix */}
                <div className="card" style={{ padding: '24px 28px', width: '75%', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 20 }}>Your palate</p>
                  <PaletteDna cuisines={cuisineEntries} />
                </div>

                {/* Most visited — 25% */}
                {dna.most_visited.length > 0 && (
                  <div className="card" style={{ padding: '24px 22px', flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 16 }}>Most visited</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dna.most_visited.map(({ name, count, emoji }, i) => (
                        <div key={name} style={{
                          background: 'var(--surface-2)', borderRadius: 12, padding: '14px 14px',
                          display: 'flex', alignItems: 'center', gap: 12, position: 'relative',
                        }}>
                          {i === 0 && <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 12 }}>👑</span>}
                          <span style={{ fontSize: 24 }}>{emoji}</span>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{count} visit{count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row: Avg rating (1/4) | Spending (1/4) | Hotspots (1/2) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16 }}>

                {/* Avg rating */}
                <div className="card" style={{ padding: '22px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 8 }}>Avg rating</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{dna.avg_rating_given}</span>
                    <span style={{ fontSize: 18 }}>⭐</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8, lineHeight: 1.4 }}>
                    {(dna.avg_rating_given ?? 0) >= 4.5 ? 'You love almost everything 🥰' : (dna.avg_rating_given ?? 0) >= 4 ? 'Generous with stars ✨' : (dna.avg_rating_given ?? 0) >= 3.5 ? 'Fair critic 🧐' : 'Tough crowd 😤'}
                  </p>
                </div>

                {/* Spending */}
                <div className="card" style={{ padding: '22px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 14 }}>Spending</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dna.price_breakdown.map(({ tier, label, pct }) => (
                      <div key={tier}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: PRICE_COLORS[tier] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotspots */}
                <div className="card" style={{ padding: '22px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 14 }}>Hotspots</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dna.top_neighbourhoods.map(({ name, count }, i) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', width: 16, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(255,90,31,0.1)', borderRadius: 99, padding: '2px 8px' }}>×{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


            </div>
          )
        })()
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {tab === 'Settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Account */}
          <Section label="Account">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)', marginBottom: 6 }}>Name</p>
                <input
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)', marginBottom: 6 }}>Email</p>
                <p style={{ fontSize: 14, color: 'var(--text-3)', padding: '10px 0' }}>{user?.email ?? '—'}</p>
              </div>
            </div>
          </Section>

          {/* Cuisines */}
          <Section label="Cuisines you love">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CUISINES.map(c => (
                <Chip key={c} label={c} active={settingsCuisines.includes(c)}
                  onClick={() => toggleList(settingsCuisines, setSettingsCuisines, c)} />
              ))}
            </div>
          </Section>

          {/* Budget */}
          <Section label="Budget">
            <div style={{ display: 'flex', gap: 8 }}>
              {BUDGETS.map(b => (
                <button key={b} onClick={() => setSettingsBudget(b)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: settingsBudget === b ? 'var(--orange)' : 'var(--surface)',
                  borderColor: settingsBudget === b ? 'var(--orange)' : 'var(--border)',
                  color: settingsBudget === b ? '#fff' : 'var(--text-2)',
                }}>{b}</button>
              ))}
            </div>
          </Section>

          {/* Distance */}
          <Section label={`Max distance · ${settingsDistance} km`}>
            <input type="range" min={1} max={25} value={settingsDistance}
              onChange={e => setSettingsDistance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--orange)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>1 km</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>25 km</span>
            </div>
          </Section>

          {/* Transport */}
          <Section label="How you get around">
            <div style={{ display: 'flex', gap: 8 }}>
              {TRANSPORT.map(t => (
                <button key={t} onClick={() => toggleList(settingsTransport, setSettingsTransport, t)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: settingsTransport.includes(t) ? 'var(--orange)' : 'var(--surface)',
                  borderColor: settingsTransport.includes(t) ? 'var(--orange)' : 'var(--border)',
                  color: settingsTransport.includes(t) ? '#fff' : 'var(--text-2)',
                }}>{t}</button>
              ))}
            </div>
          </Section>

          {/* Adventure level */}
          <Section label="Vibe">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ADVENTURE_LEVELS.map(({ value, emoji, label, desc }) => (
                <button key={value} onClick={() => setSettingsAdventure(value)} className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: settingsAdventure === value ? 'var(--orange)' : 'var(--border)',
                    background: settingsAdventure === value ? 'var(--surface-warm)' : 'var(--surface)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 1 }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Dietary */}
          <Section label="Dietary needs">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIETARY.map(d => (
                <Chip key={d} label={d} active={settingsDietary.includes(d)}
                  onClick={() => toggleList(settingsDietary, setSettingsDietary, d)} />
              ))}
            </div>
          </Section>

          {/* Save + sign out */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 32 }}>
            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                background: saveSuccess ? '#22c55e' : 'var(--orange)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
                transition: 'background 0.2s',
              }}
            >
              {saving ? 'Saving…' : saveSuccess ? 'Saved ✓' : 'Save changes'}
            </button>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: 'none', border: '1px solid var(--border)',
                fontSize: 14, fontWeight: 600, color: '#ef4444', cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {label}
      </p>
      <div className="card" style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
        border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
        background: active ? 'var(--orange)' : 'var(--surface)',
        borderColor: active ? 'var(--orange)' : 'var(--border)',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >
      {label}
    </button>
  )
}
