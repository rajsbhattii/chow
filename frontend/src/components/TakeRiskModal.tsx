import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Star, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { bookmarkRestaurant, confirmRisk } from '../data/restaurants'
import type { RestaurantDetail } from '../data/restaurants'

interface Props {
  restaurant: RestaurantDetail | null
  onClose: () => void
}

export default function TakeRiskModal({ restaurant, onClose }: Props) {
  const [phase, setPhase] = useState<'preview' | 'confirmed' | 'badge'>('preview')
  const [loading, setLoading] = useState(false)

  // Reset phase when a new restaurant is shown
  const isOpen = !!restaurant

  async function handleConfirm() {
    if (!restaurant || loading) return
    setLoading(true)
    try {
      await bookmarkRestaurant(restaurant.id)
      const risk = await confirmRisk()
      setPhase(risk.badge_unlocked ? 'badge' : 'confirmed')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setPhase('preview')
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && restaurant && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          <div style={{ position: 'fixed', inset: 0, zIndex: 201, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'none' }}>
            <motion.div
              key="sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 42 }}
              style={{
                width: '100%', maxWidth: 640, maxHeight: '90vh',
                background: 'var(--surface)', borderRadius: '20px 20px 0 0',
                overflowY: 'auto', pointerEvents: 'auto',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>🎲 Take a Risk</p>
                <button onClick={handleClose} style={{
                  width: 30, height: 30, borderRadius: '50%', background: 'var(--bg)',
                  border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={14} />
                </button>
              </div>

              {phase === 'preview' && (
                <>
                  {restaurant.imageUrl ? (
                    <img src={restaurant.imageUrl} alt={restaurant.name} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 240, background: 'var(--surface-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>
                      {restaurant.imageEmoji}
                    </div>
                  )}

                  <div style={{ padding: '22px 24px 36px' }}>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                      {restaurant.name}
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{restaurant.cuisine}</span>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{restaurant.priceLabel}</span>
                      {restaurant.avgRating && (
                        <>
                          <span style={{ color: 'var(--border)' }}>·</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={13} color="#facc15" fill="#facc15" />
                            <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>{restaurant.avgRating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color="var(--text-4)" />
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                          {restaurant.distanceKm < 1
                            ? `${Math.round(restaurant.distanceKm * 1000)} m`
                            : `${restaurant.distanceKm.toFixed(1)} km`} · {restaurant.walkMinutes} min walk
                        </span>
                      </div>
                    </div>

                    {restaurant.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                        {restaurant.tags.map(tag => (
                          <span key={tag} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {restaurant.neighbourhood && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
                        <MapPin size={13} color="var(--text-4)" />
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{restaurant.neighbourhood}{restaurant.location ? ` · ${restaurant.location}` : ''}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        style={{
                          flex: 1, padding: '13px', borderRadius: 12, background: 'var(--orange)',
                          color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                          cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        }}
                      >
                        {loading ? '…' : "I'm taking this risk! 🎲"}
                      </button>
                      <button onClick={handleClose} style={{
                        flex: 1, padding: '13px', borderRadius: 12, background: 'var(--bg)',
                        color: 'var(--text-2)', border: '1px solid var(--border)', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      }}>
                        <X size={15} /> Nope
                      </button>
                    </div>
                  </div>
                </>
              )}

              {phase === 'confirmed' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', gap: 14 }}>
                  <span style={{ fontSize: 52 }}>🎲</span>
                  <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                    You're going to {restaurant.name}!
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.5 }}>
                    Saved to your list. We'll check in with you in a couple days.
                  </p>
                  <button onClick={handleClose} style={{
                    marginTop: 8, padding: '12px 28px', borderRadius: 12, background: 'var(--orange)',
                    color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Let's go →
                  </button>
                </div>
              )}

              {phase === 'badge' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', gap: 14 }}>
                  <span style={{ fontSize: 64 }}>🎲</span>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                    Gambler unlocked!
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.5, maxWidth: 260 }}>
                    10 risks taken. You're officially chaotic good. {restaurant.name} is saved to your list.
                  </p>
                  <div style={{
                    marginTop: 8, padding: '14px 24px', borderRadius: 14,
                    background: 'rgba(255,90,31,0.08)', border: '1.5px solid var(--orange)',
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>🎲 Gambler · Badge earned</p>
                  </div>
                  <button onClick={handleClose} style={{
                    marginTop: 4, padding: '12px 28px', borderRadius: 12, background: 'var(--orange)',
                    color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Let's go →
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
