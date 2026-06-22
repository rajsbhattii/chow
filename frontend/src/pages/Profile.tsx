import { useState } from 'react'

const TABS = ['Stats', 'Badges', 'Taste DNA', 'Settings']

const BADGES = [
  { label: 'Globe Trotter', emoji: '🌍', desc: 'Try 10 cuisines' },
  { label: 'Gambler', emoji: '🎲', desc: 'Use Take a Risk 10×' },
  { label: 'Trendsetter', emoji: '📈', desc: 'Visit before 4.5 stars' },
  { label: 'Regular', emoji: '🏠', desc: 'Visit same spot 5×' },
  { label: 'First In Line', emoji: '🥇', desc: 'Visit new opening in a week' },
  { label: 'Off the Map', emoji: '🗺️', desc: '<50 reviews' },
  { label: 'Full Send', emoji: '🚀', desc: "Visit one you'd normally skip" },
]

export default function Profile() {
  const [tab, setTab] = useState('Stats')

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, border: '1px solid #fed7aa',
        }}>🧑</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>Your Name</h1>
          <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>you@example.com</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e4e4e7', marginBottom: 32 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none',
              borderBottom: `2px solid ${tab === t ? '#f97316' : 'transparent'}`,
              color: tab === t ? '#f97316' : '#71717a',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Stats' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
          <div style={{
            background: '#09090b', borderRadius: 16, padding: '32px 28px',
            color: '#fff', width: 220, flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 13, color: '#71717a' }}>Your 2025 so far</p>
            <div>
              <p style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>0</p>
              <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>restaurants visited</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
            {[
              { label: 'Total swipes', value: '0' },
              { label: 'Restaurants saved', value: '0' },
              { label: 'Cuisines tried', value: '0' },
              { label: 'Adventure score', value: '—' },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ padding: '24px 22px' }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#09090b', letterSpacing: '-0.03em' }}>{value}</p>
                <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {BADGES.map(({ label, emoji, desc }) => (
            <div key={label} className="card" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              padding: '28px 16px', textAlign: 'center', opacity: 0.35,
            }}>
              <span style={{ fontSize: 36 }}>{emoji}</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#09090b' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.4 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Taste DNA' && (
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px', textAlign: 'center', gap: 14, borderStyle: 'dashed',
        }}>
          <span style={{ fontSize: 52 }}>🧬</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#09090b' }}>Your Taste DNA</p>
          <p style={{ fontSize: 14, color: '#a1a1aa' }}>Swipe more restaurants to unlock your cuisine profile.</p>
        </div>
      )}

      {tab === 'Settings' && (
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Preferences', desc: 'Budget, distance, cuisine defaults' },
            { label: 'Dietary needs', desc: 'Vegetarian, vegan, gluten-free and more' },
            { label: 'Notifications', desc: 'Visit nudges and weekly recaps' },
          ].map(({ label, desc }) => (
            <button key={label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12, background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#09090b' }}>{label}</p>
                <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>{desc}</p>
              </div>
              <span style={{ color: '#d4d4d8', fontSize: 18 }}>›</span>
            </button>
          ))}
          <button style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 12,
            background: 'none', border: 'none', textAlign: 'left',
            fontSize: 14, fontWeight: 600, color: '#ef4444', cursor: 'pointer',
          }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
