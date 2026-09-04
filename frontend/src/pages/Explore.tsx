import { ChevronDown, Search, Star, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import RestaurantModal from '../components/RestaurantModal'
import TakeRiskModal from '../components/TakeRiskModal'
import type { RestaurantDetail } from '../data/restaurants'
import { fetchRandomRestaurant, searchRestaurants } from '../data/restaurants'

const PAGE_SIZE = 10

const VIBES = [
  { label: 'Trending',     emoji: '🔥', sort: 'trending' },
  { label: 'New openings', emoji: '✨', sort: 'new' },
  { label: 'Top rated',    emoji: '⭐', sort: 'top_rated' },
  { label: 'Hidden gems',  emoji: '💎', tag:  'hidden_gem' },
  { label: 'Late night',   emoji: '🌙', tag:  'late_night' },
]

const SORT_OPTIONS = [
  { value: '', label: 'Sort by' },
  { value: 'top_rated', label: 'Top rated' },
  { value: 'trending', label: 'Most reviewed' },
  { value: 'new', label: 'Newest' },
]

const CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Indian', 'Thai', 'Chinese',
  'Korean', 'Mediterranean', 'American', 'French', 'Greek',
  'Vietnamese', 'Middle Eastern', 'Ethiopian', 'Brunch', 'Seafood',
]

const DEFAULT_LAT = 43.6532
const DEFAULT_LNG = -79.3832

function RestaurantCard({ r, onClick }: { r: RestaurantDetail; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = ''
        ;(e.currentTarget as HTMLElement).style.boxShadow = ''
      }}
    >
      {/* Image */}
      <div style={{ height: 130, background: 'var(--surface-2)', position: 'relative', flexShrink: 0 }}>
        {r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>
            {r.imageEmoji}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3, margin: 0 }}>
          {r.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>
          {r.cuisine} · {r.priceLabel}
          {r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
        </p>
        {r.avgRating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Star size={10} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
              {r.avgRating.toFixed(1)}
            </span>
            {r.reviewCount != null && (
              <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
                ({r.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export default function Explore() {
  const [lat, setLat] = useState(DEFAULT_LAT)
  const [lng, setLng] = useState(DEFAULT_LNG)

  const [query, setQuery] = useState('')
  const [activeVibe, setActiveVibe] = useState<string | null>(null)
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement | null>(null)

  const [results, setResults] = useState<RestaurantDetail[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [riskRolling, setRiskRolling] = useState(false)
  const [riskRestaurant, setRiskRestaurant] = useState<RestaurantDetail | null>(null)

  const [selected, setSelected] = useState<RestaurantDetail | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get user location once
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude) },
      () => {},
    )
  }, [])

  // Close the sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sortOpen])

  const activeVibeObj = VIBES.find(v => v.label === activeVibe)

  const load = useCallback(async (newOffset: number, append: boolean) => {
    if (newOffset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const vibeSort = activeVibeObj && 'sort' in activeVibeObj ? activeVibeObj.sort : undefined
      const res = await searchRestaurants(lat, lng, {
        q: query || undefined,
        sort: sortBy || vibeSort || undefined,
        tag: activeVibeObj && 'tag' in activeVibeObj ? activeVibeObj.tag : undefined,
        cuisine: activeCuisine || undefined,
        limit: PAGE_SIZE,
        offset: newOffset,
      })

      if (append) {
        setResults(prev => [...prev, ...res.restaurants])
      } else {
        setResults(res.restaurants)
      }
      setTotal(res.total)
      setOffset(newOffset)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [lat, lng, query, activeVibeObj, activeCuisine, sortBy])

  // Debounced search on query/filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load(0, false)
    }, query ? 300 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeVibe, activeCuisine, sortBy, lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleVibe(label: string) {
    setActiveVibe(prev => prev === label ? null : label)
  }

  function toggleCuisine(c: string) {
    setActiveCuisine(prev => prev === c ? null : c)
  }

  const hasMore = results.length < total

  async function handleRisk() {
    if (riskRolling) return
    setRiskRolling(true)
    try {
      const activeVibeObj = VIBES.find(v => v.label === activeVibe)
      const tag = activeVibeObj && 'tag' in activeVibeObj ? activeVibeObj.tag : undefined
      const restaurant = await fetchRandomRestaurant({
        lat, lng,
        cuisine: activeCuisine ?? undefined,
        tag,
        q: query || undefined,
      })
      setRiskRestaurant(restaurant)
    } catch {
      // no results for current filters — silently ignore
    } finally {
      setRiskRolling(false)
    }
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 20 }}>
        Explore
      </h1>

      {/* Search bar */}
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', marginBottom: 20,
      }}>
        <Search size={15} color="var(--text-4)" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search restaurants or neighbourhoods..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--text-1)', flex: 1,
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={14} color="var(--text-4)" />
          </button>
        )}
      </div>

      {/* Vibe chips + Sort dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, paddingBottom: 4, scrollbarWidth: 'none' }}>
          {VIBES.map(v => {
            const active = activeVibe === v.label
            return (
              <button
                key={v.label}
                onClick={() => toggleVibe(v.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                  border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14 }}>{v.emoji}</span> {v.label}
              </button>
            )
          })}
        </div>

        {/* Take a Risk button */}
        <button
          className="risk-btn"
          onClick={handleRisk}
          disabled={riskRolling}
          title="Take a Risk"
          style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: riskRolling ? 'default' : 'pointer',
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6,
            opacity: riskRolling ? 0.6 : 1, transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 15 }}>{riskRolling ? '⏳' : '🎲'}</span>
          <span className="risk-label">Take a Risk</span>
        </button>

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setSortOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: sortBy ? 'var(--text-1)' : 'var(--text-4)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort by'}
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              style={{
                opacity: 0.6,
                transform: sortOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          {sortOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: '100%', zIndex: 20,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: 4,
            }}>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setSortBy(o.value); setSortOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 10px', borderRadius: 7,
                    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                    border: 'none', cursor: 'pointer',
                    background: sortBy === o.value ? 'var(--surface-warm)' : 'transparent',
                    color: sortBy === o.value ? 'var(--orange)' : 'var(--text-2)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cuisine chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {CUISINES.map(c => {
          const active = activeCuisine === c
          return (
            <button
              key={c}
              onClick={() => toggleCuisine(c)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'rgba(255,90,31,0.1)' : 'var(--surface)',
                color: active ? 'var(--accent)' : 'var(--text-3)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-4)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🍽️</p>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No restaurants found</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 16, fontWeight: 500 }}>
            {total} restaurant{total !== 1 ? 's' : ''} found
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {results.map(r => (
              <RestaurantCard key={r.id} r={r} onClick={() => setSelected(r)} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <button
                onClick={() => load(offset + PAGE_SIZE, true)}
                disabled={loadingMore}
                style={{
                  padding: '10px 28px', borderRadius: 99, fontSize: 14, fontWeight: 600,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-2)', cursor: loadingMore ? 'default' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? 'Loading...' : `See more (${total - results.length} left)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Restaurant detail modal */}
      {selected && (
        <RestaurantModal
          isOpen={!!selected}
          restaurant={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Take a Risk modal */}
      <TakeRiskModal
        restaurant={riskRestaurant}
        onClose={() => setRiskRestaurant(null)}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
