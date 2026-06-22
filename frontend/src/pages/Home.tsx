import { ChevronRight } from 'lucide-react'
import SwipeCard from '../components/SwipeCard'

const VIBES = [
  { label: 'Date night', emoji: '🕯️' },
  { label: 'Quick bite', emoji: '⚡' },
  { label: 'Brunch', emoji: '🥂' },
  { label: 'Adventurous', emoji: '🗺️' },
  { label: 'Comfort food', emoji: '🍜' },
  { label: 'Group dinner', emoji: '🥳' },
]

const FILTERS = ['Any budget', 'Under 5 km', 'Any cuisine', 'Open now']

const MOCK_RESTAURANT = {
  name: 'Momofuku Noodle Bar',
  cuisine: 'Japanese',
  priceScale: 2,
  distance: '0.8 km',
  rating: 4.7,
  imageUrl: 'https://picsum.photos/seed/ramen/800/600',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 11) return { text: 'Good morning', emoji: '🌅' }
  if (h < 15) return { text: 'Lunch time?', emoji: '🍱' }
  if (h < 20) return { text: 'Dinner plans?', emoji: '🍽️' }
  return { text: 'Late night cravings?', emoji: '🌙' }
}

export default function Home() {
  const { text, emoji } = getGreeting()

  return (
    <div className="page" style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

      {/* ── Left column ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Greeting */}
        <div>
          <p style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 500, marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', color: '#09090b', lineHeight: 1.1 }}>
            {text} {emoji}
          </h1>
          <p style={{ fontSize: 15, color: '#71717a', marginTop: 8 }}>
            Where do you want to eat tonight?
          </p>
        </div>

        {/* Nudge */}
        <button className="card" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', textAlign: 'left', width: '100%',
          cursor: 'pointer', transition: 'box-shadow 0.15s',
          background: '#fff7ed', borderColor: '#fed7aa',
        }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#09090b' }}>
              Did you make it to Momofuku?
            </p>
            <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>
              You saved it last week — tap to log your visit
            </p>
          </div>
          <ChevronRight size={16} color="#d4d4d8" />
        </button>

        {/* Vibe selector */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#09090b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What's the move?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {VIBES.map(({ label, emoji }) => (
              <button
                key={label}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '20px 12px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#f97316'
                  ;(e.currentTarget as HTMLElement).style.background = '#fff7ed'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e4e4e7'
                  ;(e.currentTarget as HTMLElement).style.background = '#fff'
                }}
              >
                <span style={{ fontSize: 26 }}>{emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#3f3f46' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#09090b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Filters
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f, i) => (
              <button
                key={f}
                style={{
                  padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: i === 0 ? '#09090b' : '#fff',
                  borderColor: i === 0 ? '#09090b' : '#e4e4e7',
                  color: i === 0 ? '#fff' : '#52525b',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Right column — swipe card ── */}
      <div style={{ width: 380, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Up next
          </p>
          <p style={{ fontSize: 13, color: '#a1a1aa' }}>Drag or use buttons</p>
        </div>
        <SwipeCard restaurant={MOCK_RESTAURANT} />
      </div>

    </div>
  )
}
