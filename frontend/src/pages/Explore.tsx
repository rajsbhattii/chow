import { Search } from 'lucide-react'

const VIBES = [
  { label: 'Trending', emoji: '🔥' },
  { label: 'New openings', emoji: '✨' },
  { label: 'Hidden gems', emoji: '💎' },
  { label: 'Late night', emoji: '🌙' },
  { label: 'Vegan friendly', emoji: '🌱' },
]

const CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Indian',
  'Thai', 'Chinese', 'Korean', 'Mediterranean',
  'American', 'French', 'Middle Eastern', 'Vietnamese',
]

export default function Explore() {
  return (
    <div className="page">
      <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 24 }}>
        Explore
      </h1>

      {/* Search */}
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', marginBottom: 32, maxWidth: 560,
      }}>
        <Search size={16} color="var(--text-4)" />
        <input
          placeholder="Search restaurants, cuisines, neighbourhoods..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--text-1)', flex: 1,
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Map placeholder */}
          <div className="card" style={{
            height: 240, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 40 }}>🗺️</span>
            <p style={{ fontSize: 14, color: 'var(--text-4)', fontWeight: 500 }}>Map view coming soon</p>
          </div>

          {/* Cuisines */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-1)', marginBottom: 14 }}>
              Browse by cuisine
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CUISINES.map(c => (
                <button key={c} style={{
                  padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
                }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vibes sidebar */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-1)', marginBottom: 14 }}>
            Browse by vibe
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VIBES.map(({ label, emoji }) => (
              <button key={label} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                fontSize: 14, fontWeight: 500, color: 'var(--text-5)',
              }}>
                <span style={{ fontSize: 20 }}>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
