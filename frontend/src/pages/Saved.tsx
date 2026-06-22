import { Layers, Shuffle } from 'lucide-react'

const FILTERS = ['All', 'Want to go', 'Been here', 'Nearest', 'Cuisine']

export default function Saved() {
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: '#09090b' }}>Saved</h1>
          <p style={{ fontSize: 14, color: '#a1a1aa', marginTop: 4 }}>0 restaurants saved</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1px solid #e4e4e7', background: '#fff', color: '#3f3f46', cursor: 'pointer',
          }}>
            <Shuffle size={14} /> Surprise me
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            <Layers size={14} /> Swipe my saves
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {FILTERS.map((f, i) => (
          <button key={f} style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
            border: '1px solid', cursor: 'pointer',
            background: i === 0 ? '#09090b' : '#fff',
            borderColor: i === 0 ? '#09090b' : '#e4e4e7',
            color: i === 0 ? '#fff' : '#52525b',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="card" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', textAlign: 'center', gap: 16,
        borderStyle: 'dashed',
      }}>
        <span style={{ fontSize: 52 }}>🍽️</span>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#09090b' }}>Nothing saved yet</p>
          <p style={{ fontSize: 14, color: '#a1a1aa', marginTop: 4 }}>Swipe right on restaurants to save them here.</p>
        </div>
        <button style={{
          marginTop: 8, padding: '10px 22px', borderRadius: 10,
          background: '#f97316', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>
          Start swiping
        </button>
      </div>
    </div>
  )
}
