import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TournamentDeck from '../components/TournamentDeck'
import SwipeCard from '../components/SwipeCard'
import VisitRatingModal from '../components/VisitRatingModal'
import { bookmarkRestaurant, dismissNudge, fetchNudge, fetchRandomRestaurant, fetchRestaurants, recordSwipe, snoozeNudge } from '../data/restaurants'
import type { NudgeResponse, RestaurantDetail } from '../data/restaurants'
import TakeRiskModal from '../components/TakeRiskModal'
import { useAuth } from '../context/AuthContext'

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

const BUDGET_OPTIONS = ['$', '$$', '$$$', '$$$$']
const DISTANCE_OPTIONS = [
  { label: 'Nearby (< 1 km)', value: 1 },
  { label: 'Under 5 km', value: 5 },
  { label: 'Under 10 km', value: 10 },
  { label: 'Any distance', value: 25 },
]
const CUISINE_OPTIONS = [
  'American', 'Brunch', 'Chinese', 'Ethiopian', 'French', 'Greek',
  'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean',
  'Mexican', 'Middle Eastern', 'Seafood', 'Thai', 'Vietnamese',
]

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
  const navigate = useNavigate()

  const [restaurants, setRestaurants] = useState<RestaurantDetail[]>([])
  const [deckIndex, setDeckIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [activeVibe, setActiveVibe] = useState<{ value: string; label: string; emoji: string } | null>(null)

  const [filterBudget, setFilterBudget] = useState<string[]>([])
  const [filterDistance, setFilterDistance] = useState(25)
  const [filterCuisine, setFilterCuisine] = useState<string[]>([])
  const [openFilter, setOpenFilter] = useState<'budget' | 'distance' | 'cuisine' | null>(null)

  const [nudge, setNudge] = useState<NudgeResponse['nudge']>(null)
  const [nudgeShowFollowup, setNudgeShowFollowup] = useState(false)
  const [visitModalOpen, setVisitModalOpen] = useState(false)
  const [riskRolling, setRiskRolling] = useState(false)
  const [riskRestaurant, setRiskRestaurant] = useState<RestaurantDetail | null>(null)

  const coords = useRef({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
  const locationReady = useRef(false)

  async function handleRisk() {
    if (riskRolling) return
    setRiskRolling(true)
    try {
      const restaurant = await fetchRandomRestaurant({ lat: coords.current.lat, lng: coords.current.lng })
      setRiskRestaurant(restaurant)
    } catch {
      // no results
    } finally {
      setRiskRolling(false)
    }
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchRestaurants(coords.current.lat, coords.current.lng, {
        maxDistanceKm: filterDistance,
        budget: filterBudget.length > 0 ? filterBudget : undefined,
        cuisine: filterCuisine.length > 0 ? filterCuisine : undefined,
        excludeSwiped: true,
        shuffle: true,
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

  async function loadNudge(lat?: number, lng?: number) {
    try {
      const res = await fetchNudge(lat, lng)
      setNudge(res.nudge)
    } catch {
      // nudge is non-critical — fail silently
    }
  }

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        locationReady.current = true
        load()
        loadNudge(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        locationReady.current = true
        load()
        loadNudge()
      },
      { timeout: 5000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload freeplay deck when filters change (skip until location resolves)
  useEffect(() => {
    if (!locationReady.current) return
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBudget, filterDistance, filterCuisine])

  function toggleFilter(f: 'budget' | 'distance' | 'cuisine') {
    setOpenFilter(prev => prev === f ? null : f)
  }
  function toggleBudget(b: string) {
    setFilterBudget(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])
  }
  function toggleCuisine(c: string) {
    setFilterCuisine(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function clearFilters() {
    setFilterBudget([])
    setFilterDistance(25)
    setFilterCuisine([])
    setOpenFilter(null)
  }

  const budgetActive = filterBudget.length > 0
  const distanceActive = filterDistance < 25
  const cuisineActive = filterCuisine.length > 0
  const anyFilterActive = budgetActive || distanceActive || cuisineActive

  const budgetLabel = filterBudget.length === 0 ? 'Budget' : filterBudget.join(' · ')
  const distanceLabel = filterDistance === 25 ? 'Any distance' : `< ${filterDistance} km`
  const cuisineLabel = filterCuisine.length === 0
    ? 'Cuisine'
    : filterCuisine.length === 1
      ? filterCuisine[0]
      : `${filterCuisine.length} cuisines`

  async function handleSwipe(direction: 'left' | 'right' | 'maybe' | 'bookmark') {
    const restaurant = restaurants[deckIndex]
    if (!restaurant) return
    if (direction === 'maybe') return
    setDeckIndex(i => i + 1)
    try {
      if (direction === 'bookmark') {
        await bookmarkRestaurant(restaurant.id)
        setToast(`Saved ${restaurant.name}!`)
        setTimeout(() => setToast(''), 2500)
      } else {
        // freeplay deck has no vibe context — pass undefined
        await recordSwipe(restaurant.id, direction, undefined)
      }
    } catch {
      // swipe UI already advanced — silently ignore network errors
    }
  }

  const current = restaurants[deckIndex]

  // Restart tournament when filters change while one is active
  const tournamentKey = activeVibe
    ? `${activeVibe.value}|${filterBudget.join(',')}|${filterDistance}|${filterCuisine.join(',')}`
    : null

  return (
    <div className="page home-layout" style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

      {/* ── Left column ── */}
      <div className="home-left-col" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>

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

        {/* Nudge — only shown when there's a pending tournament pick */}
        {nudge && (
          <div className="card" style={{
            padding: '16px 20px', background: 'var(--surface-warm)', borderColor: 'var(--border-warm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: nudgeShowFollowup ? 12 : 0 }}>
              <span style={{ fontSize: 22 }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                  Did you make it to {nudge.restaurant.name}?
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
                  {nudge.restaurant.cuisine} · {nudge.restaurant.priceLabel}
                </p>
              </div>
            </div>

            {!nudgeShowFollowup ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setVisitModalOpen(true)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  Yes, I went! ✓
                </button>
                <button
                  onClick={async () => {
                    if (nudge.isFollowup) {
                      setNudgeShowFollowup(true)
                    } else {
                      await snoozeNudge(nudge.saveId).catch(() => {})
                      setNudge(null)
                    }
                  }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: 'var(--surface)', color: 'var(--text-3)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  Not yet
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                  Still planning on going?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      await dismissNudge(nudge.saveId).catch(() => {})
                      setNudge(null)
                    }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: 'var(--surface)', color: 'var(--text-3)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    Yeah, still on it
                  </button>
                  <button
                    onClick={async () => {
                      await dismissNudge(nudge.saveId).catch(() => {})
                      setNudge(null)
                    }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: 'var(--surface)', color: 'var(--text-3)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    Nah
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {visitModalOpen && nudge && (
          <VisitRatingModal
            isOpen={visitModalOpen}
            restaurantId={nudge.restaurant.id}
            restaurantName={nudge.restaurant.name}
            onClose={() => setVisitModalOpen(false)}
            onDone={() => {
              setVisitModalOpen(false)
              setNudge(null)
            }}
          />
        )}

        {/* Filters */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Filters
            </p>
            {anyFilterActive && (
              <button
                onClick={clearFilters}
                style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {([
              { key: 'budget' as const, label: budgetLabel, active: budgetActive },
              { key: 'distance' as const, label: distanceLabel, active: distanceActive },
              { key: 'cuisine' as const, label: cuisineLabel, active: cuisineActive },
            ]).map(({ key, label, active }) => (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? 'var(--surface-warm)' : 'var(--surface)',
                  borderColor: active || openFilter === key ? 'var(--orange)' : 'var(--border)',
                  color: active ? 'var(--orange)' : 'var(--text-2)',
                }}
              >
                {label}
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  style={{
                    opacity: 0.6,
                    transform: openFilter === key ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}
                />
              </button>
            ))}
            <button
              onClick={handleRisk}
              disabled={riskRolling}
              title="Take a Risk"
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                border: '1px solid var(--border)', background: 'var(--surface)',
                fontSize: 16, cursor: riskRolling ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: riskRolling ? 0.6 : 1, transition: 'opacity 0.15s',
              }}
            >
              {riskRolling ? '⏳' : '🎲'}
            </button>
          </div>

          {/* Expanded filter panel */}
          {openFilter && (
            <div style={{
              marginTop: 10, padding: '14px 16px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              {openFilter === 'budget' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {BUDGET_OPTIONS.map(b => (
                    <button
                      key={b}
                      onClick={() => toggleBudget(b)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                        background: filterBudget.includes(b) ? 'var(--orange)' : 'var(--bg)',
                        color: filterBudget.includes(b) ? '#fff' : 'var(--text-2)',
                        border: filterBudget.includes(b) ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              {openFilter === 'distance' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DISTANCE_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setFilterDistance(d.value)}
                      style={{
                        padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                        background: filterDistance === d.value ? 'var(--orange)' : 'var(--bg)',
                        color: filterDistance === d.value ? '#fff' : 'var(--text-2)',
                        border: filterDistance === d.value ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}

              {openFilter === 'cuisine' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CUISINE_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleCuisine(c)}
                      style={{
                        padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                        background: filterCuisine.includes(c) ? 'var(--orange)' : 'var(--bg)',
                        color: filterCuisine.includes(c) ? '#fff' : 'var(--text-2)',
                        border: filterCuisine.includes(c) ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vibe selector → launches tournament inline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                What's the move?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Pick a vibe to start your tournament
              </p>
            </div>
            {activeVibe && (
              <button
                onClick={() => setActiveVibe(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--border)', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <X size={14} color="var(--text-3)" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {VIBES.map(({ label, emoji: e, value }) => (
              <button
                key={value}
                onClick={() => setActiveVibe({ value, label, emoji: e })}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '20px 12px', cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: activeVibe?.value === value ? 'var(--orange)' : 'var(--border)',
                  background: activeVibe?.value === value ? 'var(--surface-warm)' : 'var(--surface)',
                }}
              >
                <span style={{ fontSize: 26 }}>{e}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: activeVibe?.value === value ? 'var(--orange)' : 'var(--text-5)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right column — tournament or freeplay deck ── */}
      <div className="home-right-col" style={{ width: 380, flexShrink: 0, position: 'relative' }}>
        {activeVibe ? (
          <TournamentDeck
            key={tournamentKey!}
            vibe={activeVibe.value}
            vibeLabel={activeVibe.label}
            vibeEmoji={activeVibe.emoji}
            lat={coords.current.lat}
            lng={coords.current.lng}
            maxDistanceKm={filterDistance}
            budget={filterBudget.length > 0 ? filterBudget : undefined}
            cuisine={filterCuisine.length > 0 ? filterCuisine : undefined}
            onExit={() => setActiveVibe(null)}
            onNavigateSaved={() => navigate('/saved')}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Up next
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-4)' }}>
                {!loading && restaurants.length > 0 ? `${deckIndex + 1} of ${restaurants.length}` : ''}
              </p>
            </div>

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
                action={{ label: 'Start over', onClick: load }}
              />
            ) : (
              <SwipeCard
                key={current.id}
                restaurant={current}
                onSwipe={handleSwipe}
              />
            )}
          </>
        )}
      </div>

      <TakeRiskModal
        restaurant={riskRestaurant}
        onClose={() => setRiskRestaurant(null)}
      />
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
