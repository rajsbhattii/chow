import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookmarkRestaurant, fetchRestaurants, lockInRestaurant, recordSwipe } from '../data/restaurants'
import type { RestaurantDetail } from '../data/restaurants'
import SwipeCard from './SwipeCard'

const ROUND_SIZES = [15, 8, 4]
const RESULT_COUNT = 3

type Phase = 'loading' | 'swiping' | 'between' | 'empty' | 'result'

interface Props {
  vibe: string
  vibeLabel: string
  vibeEmoji: string
  lat: number
  lng: number
  maxDistanceKm: number
  budget?: string[]
  cuisine?: string[]
  onExit: () => void
  onNavigateSaved: () => void
}

export default function TournamentDeck({
  vibe, vibeLabel, vibeEmoji,
  lat, lng, maxDistanceKm,
  budget, cuisine,
  onExit, onNavigateSaved,
}: Props) {
  const [phase, setPhase]         = useState<Phase>('loading')
  const [round, setRound]         = useState(0)
  const [pool, setPool]           = useState<RestaurantDetail[]>([])
  const [deckIndex, setDeckIndex] = useState(0)
  const [kept, setKept]           = useState<RestaurantDetail[]>([])
  const [nextPool, setNextPool]   = useState<RestaurantDetail[]>([])
  const [results, setResults]     = useState<RestaurantDetail[]>([])
  const [seenIds]                 = useState<Set<string>>(new Set())
  const [lockedIn, setLockedIn]   = useState(false)

  useEffect(() => { startRound(0) }, [])

  async function startRound(roundIndex: number) {
    setPhase('loading')
    try {
      const res = await fetchRestaurants(lat, lng, {
        maxDistanceKm,
        vibe: vibe || undefined,
        budget: budget?.length ? budget : undefined,
        cuisine: cuisine?.length ? cuisine : undefined,
        excludeSwiped: true,
        shuffle: true,
        limit: ROUND_SIZES[roundIndex],
      })
      const fresh = res.restaurants.filter(r => !seenIds.has(r.id))
      fresh.forEach(r => seenIds.add(r.id))

      if (fresh.length === 0) { setPhase('empty'); return }

      setPool(fresh)
      setDeckIndex(0)
      setKept([])
      setRound(roundIndex)
      setPhase('swiping')
    } catch {
      setPhase('empty')
    }
  }

  async function handleSwipe(dir: 'left' | 'right' | 'maybe' | 'bookmark') {
    const restaurant = pool[deckIndex]
    if (!restaurant) return

    const keep = dir === 'right' || dir === 'maybe' || dir === 'bookmark'
    if (dir === 'bookmark') {
      bookmarkRestaurant(restaurant.id).catch(() => {})
    } else if (dir !== 'maybe') {
      recordSwipe(restaurant.id, dir).catch(() => {})
    }

    const updatedKept = keep ? [...kept, restaurant] : kept
    const nextIndex = deckIndex + 1

    if (nextIndex < pool.length) {
      setDeckIndex(nextIndex)
      setKept(updatedKept)
      return
    }

    if (updatedKept.length === 0) { setPhase('empty'); return }

    if (round >= ROUND_SIZES.length - 1) {
      setResults(updatedKept.slice(0, RESULT_COUNT))
      setPhase('result')
    } else {
      const maxKeep = ROUND_SIZES[round + 1]
      const shuffled = [...updatedKept].sort(() => Math.random() - 0.5).slice(0, maxKeep)
      setNextPool(shuffled)
      setPhase('between')
    }
  }

  async function handleLockIn() {
    if (!results[0]) return
    setLockedIn(true)
    lockInRestaurant(results[0].id).catch(() => {})
    setTimeout(onExit, 1800)
  }

  function continueToNextRound() {
    setPool(nextPool)
    setDeckIndex(0)
    setKept([])
    setRound(r => r + 1)
    setNextPool([])
    setPhase('swiping')
  }

  const progressPct = phase === 'swiping' ? (deckIndex / pool.length) * 100 : phase === 'result' ? 100 : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {phase === 'swiping' ? `Round ${round + 1} of ${ROUND_SIZES.length}` : phase === 'result' ? 'Results' : 'Tournament'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-4)' }}>
          {vibeEmoji} {vibeLabel}
        </p>
      </div>

      {/* Progress bar */}
      {phase === 'swiping' && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-4)', marginBottom: 5 }}>
            <span>{deckIndex} of {pool.length} reviewed</span>
            <span>{kept.length} kept</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{
              height: '100%', borderRadius: 99, background: 'var(--orange)',
              width: `${progressPct}%`, transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}

      {/* Round dots */}
      {phase === 'swiping' && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {ROUND_SIZES.map((_, i) => (
            <div key={i} style={{
              width: i === round ? 20 : 8, height: 8, borderRadius: 99,
              background: i <= round ? 'var(--orange)' : 'var(--border)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <EmptyCard icon="🍽️" title="Finding restaurants…" />
      )}

      {/* Swiping */}
      {phase === 'swiping' && pool[deckIndex] && (
        <SwipeCard
          key={pool[deckIndex].id}
          restaurant={pool[deckIndex]}
          onSwipe={handleSwipe}
        />
      )}

      {/* Between rounds */}
      {phase === 'between' && (
        <EmptyCard icon="🎯" title={`Round ${round + 1} done`} subtitle={`${nextPool.length} restaurant${nextPool.length !== 1 ? 's' : ''} made the cut`}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0' }}>
            {nextPool.map(r => (
              <div key={r.id} style={{
                width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
                background: 'var(--surface-warm)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                {r.imageUrl
                  ? <img src={r.imageUrl} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : r.imageEmoji}
              </div>
            ))}
          </div>
          <button onClick={continueToNextRound} style={{
            padding: '11px 28px', borderRadius: 12,
            background: 'var(--orange)', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Round {round + 2} →
          </button>
        </EmptyCard>
      )}

      {/* Empty — regenerate */}
      {phase === 'empty' && (
        <EmptyCard icon="😬" title="Nothing kept" subtitle="Tough crowd — let's try a fresh batch.">
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => startRound(0)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10,
              background: 'var(--orange)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <RefreshCw size={13} /> Try again
            </button>
            <button onClick={onExit} style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'var(--surface)', color: 'var(--text-3)',
              border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Exit
            </button>
          </div>
        </EmptyCard>
      )}

      {/* Results */}
      {phase === 'result' && results.length > 0 && (
        <div>
          {lockedIn ? (
            <EmptyCard icon="🎯" title={`You're going to ${results[0].name}!`} subtitle="We'll check in with you in a couple days." />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>🏆</span>
                <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginTop: 6 }}>
                  Tonight's pick
                </p>
              </div>

              <ResultCard restaurant={results[0]} rank={1} />

              <button onClick={handleLockIn} style={{
                width: '100%', marginTop: 10, padding: '13px',
                borderRadius: 12, background: 'var(--orange)', color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}>
                Lock it in 🎯
              </button>

              {results.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Also great
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {results.slice(1).map((r, i) => (
                      <ResultCard key={r.id} restaurant={r} rank={i + 2} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => { seenIds.clear(); startRound(0) }} style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  background: 'var(--surface)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  New tournament
                </button>
                <button onClick={onNavigateSaved} style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  background: 'var(--surface)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  View saved →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyCard({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle?: string; children?: React.ReactNode
}) {
  return (
    <div style={{
      height: 466, borderRadius: 20,
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '0 32px', textAlign: 'center',
    }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{title}</p>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ResultCard({ restaurant: r, rank }: { restaurant: RestaurantDetail; rank: number }) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
  return (
    <div className="card" style={{
      display: 'flex', gap: 0, overflow: 'hidden', padding: 0,
      ...(rank === 1 ? { borderColor: '#f97316', boxShadow: '0 0 0 1px #f97316' } : {}),
    }}>
      <div style={{ width: rank === 1 ? 110 : 76, flexShrink: 0 }}>
        {r.imageUrl
          ? <img src={r.imageUrl} alt={r.name} style={{ width: '100%', height: '100%', minHeight: rank === 1 ? 100 : 72, objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', minHeight: rank === 1 ? 100 : 72, background: 'var(--surface-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: rank === 1 ? 32 : 22 }}>{r.imageEmoji}</div>
        }
      </div>
      <div style={{ flex: 1, padding: rank === 1 ? '14px' : '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: rank === 1 ? 16 : 13 }}>{rankEmoji}</span>
          <p style={{ fontWeight: 800, fontSize: rank === 1 ? 15 : 13, color: 'var(--text-1)' }}>{r.name}</p>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-4)' }}>
          {r.cuisine} · {r.priceLabel}
          {r.avgRating ? ` · ⭐ ${r.avgRating.toFixed(1)}` : ''}
          {r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
        </p>
      </div>
    </div>
  )
}
