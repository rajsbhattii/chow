import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfileStats } from '../data/restaurants'
import type { ProfileStats } from '../data/restaurants'

const TABS = ['Stats', 'Badges', 'Taste DNA', 'Settings']

const BADGES: { key: string; label: string; emoji: string; desc: string }[] = [
  { key: 'globe_trotter', label: 'Globe Trotter', emoji: '🌍', desc: 'Try 10 different cuisines' },
  { key: 'regular',       label: 'Regular',       emoji: '🏠', desc: 'Visit the same spot 5× or more' },
  { key: 'off_the_map',   label: 'Off the Map',   emoji: '🗺️', desc: 'Visit a restaurant with under 50 reviews' },
  { key: 'first_in_line', label: 'First In Line', emoji: '🥇', desc: 'Visit a new opening within a week' },
  { key: 'trendsetter',   label: 'Trendsetter',   emoji: '📈', desc: 'Visit before it hits 4.5 stars' },
  { key: 'gambler',       label: 'Gambler',        emoji: '🎲', desc: 'Use Take a Risk 10 times' },
  { key: 'full_send',     label: 'Full Send',      emoji: '🚀', desc: "Visit one you'd normally skip" },
]

const ADVENTURE_LABELS: Record<string, string> = {
  comfort_zone: '🏠 Comfort zone',
  open_minded:  '🚶 Open-minded',
  adventurous:  '🧭 Adventurous',
  full_send:    '🚀 Full send',
}

export default function Profile() {
  const [tab, setTab] = useState('Stats')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<ProfileStats | null>(null)

  useEffect(() => {
    fetchProfileStats().then(setStats).catch(() => {})
  }, [])

  function handleSignOut() {
    logout()
    navigate('/', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const year = new Date().getFullYear()
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
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
          {/* Big visits card */}
          <div style={{
            background: 'var(--surface-inverse)', borderRadius: 16, padding: '32px 28px',
            color: '#fff', width: 220, flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Your {year} so far</p>
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
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px', textAlign: 'center', gap: 14, borderStyle: 'dashed',
        }}>
          <span style={{ fontSize: 52 }}>🧬</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Your Taste DNA</p>
          <p style={{ fontSize: 14, color: 'var(--text-4)' }}>Swipe more restaurants to unlock your cuisine profile.</p>
        </div>
      )}

      {tab === 'Settings' && (
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px 8px' }}>
              Account
            </p>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Name" value={user?.name ?? '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Email" value={user?.email ?? '—'} />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px 8px' }}>
              Preferences
            </p>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Budget" value={user?.budget_range ?? '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Max distance" value={user?.max_distance ? `${user.max_distance} km` : '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Transport" value={user?.transport_modes?.join(', ') || '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Adventure level" value={user?.adventure_level ? ADVENTURE_LABELS[user.adventure_level] ?? '—' : '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Cuisines" value={user?.cuisine_preferences?.length ? user.cuisine_preferences.join(', ') : '—'} />
              <div style={{ height: 1, background: 'var(--border)' }} />
              <Row label="Dietary needs" value={user?.dietary_needs?.length ? user.dietary_needs.join(', ') : 'None'} />
            </div>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              marginTop: 12, padding: '12px 16px', borderRadius: 12,
              background: 'none', border: 'none', textAlign: 'left',
              fontSize: 14, fontWeight: 600, color: '#ef4444', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
