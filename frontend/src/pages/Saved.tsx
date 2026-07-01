import { MapPin, RefreshCw, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VisitRatingModal from '../components/VisitRatingModal'
import { deleteSave, fetchSaves, resetSwipeHistory, type SavedItem } from '../data/restaurants'

type Filter = 'all' | 'want_to_go' | 'been_here'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'want_to_go', label: 'Want to go' },
  { key: 'been_here', label: 'Been here' },
]

export default function Saved() {
  const navigate = useNavigate()
  const [saves, setSaves] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [visitTarget, setVisitTarget] = useState<SavedItem | null>(null)
  const [resetting, setResetting] = useState(false)
  const locationRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => {}
    )
  }, [])

  async function load(filter: Filter) {
    setLoading(true)
    try {
      const loc = locationRef.current
      const res = await fetchSaves({
        status: filter === 'all' ? undefined : filter,
        lat: loc?.lat,
        lng: loc?.lng,
      })
      setSaves(res.saves)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(activeFilter) }, [activeFilter])

  async function handleUnsave(saveId: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteSave(saveId)
    setSaves(prev => prev.filter(s => s.saveId !== saveId))
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetSwipeHistory()
      navigate('/home')
    } finally {
      setResetting(false)
    }
  }

  function handleVisitDone(_badges: string[]) {
    setVisitTarget(null)
    load(activeFilter)
  }

  const displayed = saves

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>Saved</h1>
          <p style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 4 }}>
            {loading ? 'Loading…' : `${saves.length} restaurant${saves.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-3)', cursor: resetting ? 'default' : 'pointer', opacity: resetting ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} style={{ animation: resetting ? 'spin 0.8s linear infinite' : 'none' }} />
          Restart deck
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
              border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: activeFilter === f.key ? 'var(--pill-active-bg)' : 'var(--surface)',
              borderColor: activeFilter === f.key ? 'var(--pill-active-bg)' : 'var(--border)',
              color: activeFilter === f.key ? 'var(--pill-active-color)' : 'var(--text-2)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: 96, background: 'var(--surface)', opacity: 0.5 }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && displayed.length === 0 && (
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px', textAlign: 'center', gap: 16, borderStyle: 'dashed',
        }}>
          <span style={{ fontSize: 52 }}>🍽️</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
              {activeFilter === 'been_here' ? 'No visits yet' : activeFilter === 'want_to_go' ? 'Nothing on the list' : 'Nothing saved yet'}
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 4 }}>
              {activeFilter === 'been_here' ? 'Mark a saved restaurant as visited to see it here.' : 'Swipe right on restaurants to save them here.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              marginTop: 8, padding: '10px 22px', borderRadius: 10,
              background: 'var(--orange)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            Start swiping
          </button>
        </div>
      )}

      {/* Save list */}
      {!loading && displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(item => {
            const r = item.restaurant
            return (
              <div
                key={item.saveId}
                className="card"
                style={{ display: 'flex', gap: 0, overflow: 'hidden', padding: 0, cursor: 'default' }}
              >
                {/* Image */}
                <div style={{ width: 100, flexShrink: 0 }}>
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', minHeight: 96,
                      background: 'var(--surface-warm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                    }}>
                      {r.imageEmoji}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', lineHeight: 1.2 }}>{r.name}</p>
                      <span style={{
                        flexShrink: 0, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: item.status === 'been_here' ? 'var(--surface-warm)' : 'rgba(249,115,22,0.1)',
                        color: item.status === 'been_here' ? 'var(--text-3)' : 'var(--orange)',
                      }}>
                        {item.status === 'been_here' ? 'Been here' : 'Want to go'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{r.cuisine}</span>
                      <span style={{ color: 'var(--border)', fontSize: 11 }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{r.priceLabel}</span>
                      {r.avgRating && (
                        <>
                          <span style={{ color: 'var(--border)', fontSize: 11 }}>·</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={11} color="#facc15" fill="#facc15" />
                            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{r.avgRating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                      {r.neighbourhood && (
                        <>
                          <span style={{ color: 'var(--border)', fontSize: 11 }}>·</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={10} color="var(--text-4)" />
                            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{r.neighbourhood}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {item.status === 'want_to_go' && (
                      <button
                        onClick={() => setVisitTarget(item)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer',
                        }}
                      >
                        ✓ Yes, I went!
                      </button>
                    )}
                    <button
                      onClick={e => handleUnsave(item.saveId, e)}
                      style={{
                        padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        background: 'var(--bg)', color: 'var(--text-4)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <Trash2 size={12} /> Unsave
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visit rating modal */}
      {visitTarget && (
        <VisitRatingModal
          isOpen={!!visitTarget}
          restaurantId={visitTarget.restaurant.id}
          restaurantName={visitTarget.restaurant.name}
          onClose={() => setVisitTarget(null)}
          onDone={handleVisitDone}
        />
      )}
    </div>
  )
}
