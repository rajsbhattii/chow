import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SwipeCard from '../components/SwipeCard'
import { fetchRestaurants, recordSwipe } from '../data/restaurants'
import type { RestaurantDetail } from '../data/restaurants'
import { useAuth } from '../context/AuthContext'

// Downtown Toronto fallback if user denies location
const DEFAULT_LAT = 43.6532
const DEFAULT_LNG = -79.3832

const VIBES = [
  { label: 'Date night', emoji: '🕯️', value: 'date_night' },
  { label: 'Quick bite', emoji: '⚡', value: 'quick_bite' },
  { label: 'Brunch', emoji: '🥂', value: 'brunch' },
  { label: 'Adventurous', emoji: '🗺️', value: 'adventurous' },
  { label: 'Comfort food', emoji: '🍜', value: 'comfort' },
  { label: 'Group dinner', emoji: '🥳', value: 'group' },
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
  const { user } = useAuth()

  const [restaurants, setRestaurants] = useState<RestaurantDetail[]>([])
  const [deckIndex, setDeckIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeVibe, setActiveVibe] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const coords = useRef({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })

  async function load(vibe?: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetchRestaurants(coords.current.lat, coords.current.lng, {
        maxDistanceKm: user?.max_distance ?? 25,
        vibe: vibe ?? activeVibe ?? undefined,
        excludeSwiped: true,
        limit: 50,
      })
      setRestaurants(res.restaurants)
      setDeckIndex(0)
    } catch {
      setError('Could not load restaurants. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        load()
      },
      () => load(), // denied — use Toronto default
      { timeout: 5000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectVibe(value: string) {
    if (activeVibe === value) {
      // Re-click same vibe → reshuffle, keep it active
      load(value)
    } else {
      setActiveVibe(value)
      load(value)
    }
  }

  async function handleSwipe(direction: 'left' | 'right' | 'maybe') {
    const restaurant = restaurants[deckIndex]
    if (!restaurant) return

    if (direction === 'maybe') return  // stays in deck, nothing recorded

    setDeckIndex(i => i + 1)

    try {
      const result = await recordSwipe(restaurant.id, direction)
      if (result.saved) {
        setToast(`Saved ${restaurant.name}!`)
        setTimeout(() => setToast(''), 2500)
      }
    } catch {
      // swipe UI already advanced — silently ignore network errors
    }
  }

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
            {user?.name ? `Hey ${user.name.split(' ')[0]} —` : ''} where do you want to eat tonight?
          </p>
        </div>

        {/* Nudge */}
        <button className="card" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', textAlign: 'left', width: '100%',
          cursor: 'pointer', background: 'var(--surface-warm)', borderColor: 'var(--border-warm)',
        }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              Did you make it to your last save?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>
              Tap to log your visit
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
            {VIBES.map(({ label, emoji: e, value }) => (
              <button
                key={value}
                onClick={() => selectVibe(value)}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '20px 12px', cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: activeVibe === value ? 'var(--orange)' : 'var(--border)',
                  background: activeVibe === value ? 'var(--surface-warm)' : 'var(--surface)',
                }}
              >
                <span style={{ fontSize: 26 }}>{e}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: activeVibe === value ? 'var(--orange)' : 'var(--text-5)' }}>{label}</span>
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
      <div style={{ width: 380, flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Up next
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>
            {!loading && restaurants.length > 0 ? `${deckIndex + 1} of ${restaurants.length}` : ''}
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface-inverse)', color: '#fff',
            padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', zIndex: 10,
          }}>
            ❤️ {toast}
          </div>
        )}

        {loading ? (
          <EmptyDeck icon="🍜" title="Finding restaurants nearby…" />
        ) : error ? (
          <EmptyDeck icon="⚠️" title={error} />
        ) : !current ? (
          <EmptyDeck
            icon="✅"
            title="You've seen everything!"
            subtitle="Check your saved restaurants or reset the deck."
            action={{ label: 'Start over', onClick: () => load() }}
          />
        ) : (
          <SwipeCard
            key={current.id}
            restaurant={current}
            onSwipe={handleSwipe}
          />
        )}
      </div>
    </div>
  )
}

function EmptyDeck({ icon, title, subtitle, action }: {
  icon: string
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{
      height: 466, borderRadius: 20,
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', textAlign: 'center', maxWidth: 240 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-4)' }}>{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8, padding: '9px 20px', borderRadius: 10,
            background: 'var(--orange)', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
