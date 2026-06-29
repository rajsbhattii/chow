import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import SwipeCard from '../components/SwipeCard'
import { MOCK_RESTAURANTS, fetchNearbyRestaurants } from '../data/restaurants'
import type { RestaurantDetail } from '../data/restaurants'

const VIBES = [
  { label: 'Date night', emoji: '🕯️' },
  { label: 'Quick bite', emoji: '⚡' },
  { label: 'Brunch', emoji: '🥂' },
  { label: 'Adventurous', emoji: '🗺️' },
  { label: 'Comfort food', emoji: '🍜' },
  { label: 'Group dinner', emoji: '🥳' },
]

const FILTERS = ['Any budget', 'Under 5 km', 'Any cuisine', 'Open now']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 11) return { text: 'Good morning', emoji: '🌅' }
  if (h < 15) return { text: 'Lunch time?', emoji: '🍱' }
  if (h < 20) return { text: 'Dinner plans?', emoji: '🍽️' }
  return { text: 'Late night cravings?', emoji: '🌙' }
}

export default function Home() {
  const { text, emoji } = getGreeting()
  const [restaurants, setRestaurants] = useState<RestaurantDetail[]>([])
  const [deckIndex, setDeckIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Greater Toronto Area — downtown Toronto
    fetchNearbyRestaurants(43.6532, -79.3832)
      .then(data => { setRestaurants(data); setLoading(false) })
      .catch(() => {
        setRestaurants(MOCK_RESTAURANTS)
        setLoading(false)
      })
  }, [])

  const current = restaurants[deckIndex]

  return (
    <div className="page" style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

      {/* ── Left column ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Greeting */}
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-4)', fontWeight: 500, marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.1 }}>
            {text} {emoji}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 8 }}>
            Where do you want to eat tonight?
          </p>
        </div>

        {/* Nudge */}
        <button className="card" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', textAlign: 'left', width: '100%',
          cursor: 'pointer', transition: 'box-shadow 0.15s',
          background: 'var(--surface-warm)', borderColor: 'var(--border-warm)',
        }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              Did you make it to Momofuku?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>
              You saved it last week — tap to log your visit
            </p>
          </div>
          <ChevronRight size={16} color="var(--border)" />
        </button>

        {/* Vibe selector */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What's the move?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {VIBES.map(({ label, emoji }) => (
              <button
                key={label}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '20px 12px', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-warm)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                }}
              >
                <span style={{ fontSize: 26 }}>{emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-5)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Filters
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f, i) => (
              <button
                key={f}
                style={{
                  padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: i === 0 ? 'var(--pill-active-bg)' : 'var(--surface)',
                  borderColor: i === 0 ? 'var(--pill-active-bg)' : 'var(--border)',
                  color: i === 0 ? 'var(--pill-active-color)' : 'var(--text-2)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Right column — deck ── */}
      <div style={{ width: 380, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Up next
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>
            {loading ? 'Loading...' : restaurants.length > 0 ? `${deckIndex + 1} of ${restaurants.length}` : ''}
          </p>
        </div>

        {loading ? (
          <div style={{
            height: 466, borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 32 }}>🍜</span>
            <p style={{ fontSize: 14, color: 'var(--text-4)', fontWeight: 500 }}>Finding restaurants nearby…</p>
          </div>
        ) : !current ? (
          <div style={{
            height: 466, borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 32 }}>✅</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>You've seen everything!</p>
            <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Check your saved restaurants.</p>
            <button
              onClick={() => setDeckIndex(0)}
              style={{
                marginTop: 8, padding: '9px 20px', borderRadius: 10,
                background: 'var(--orange)', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Start over
            </button>
          </div>
        ) : (
          <SwipeCard
            key={current.id}
            restaurant={current}
            onSwipe={() => setDeckIndex(i => i + 1)}
          />
        )}
      </div>

    </div>
  )
}
