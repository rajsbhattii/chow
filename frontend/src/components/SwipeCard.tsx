import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Bookmark, Heart, MapPin, Star, Undo2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { RestaurantDetail } from '../data/restaurants'
import RestaurantModal from './RestaurantModal'

const SWIPE_THRESHOLD = 80

interface Props {
  restaurant: RestaurantDetail
  onSwipe?: (dir: 'left' | 'right' | 'maybe' | 'bookmark') => void
}

export default function SwipeCard({ restaurant, onSwipe }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [30, 100], [0, 1])
  const passOpacity = useTransform(x, [-100, -30], [1, 0])

  const [gone, setGone] = useState<'left' | 'right' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const ref = useRef(null)

  function flyOut(dir: 'left' | 'right' | 'maybe' | 'bookmark') {
    if (dir === 'maybe') {
      if (onSwipe) onSwipe('maybe')
      return
    }
    animate(x, dir === 'left' ? -600 : 600, { duration: 0.35, ease: 'easeIn' })
    setTimeout(() => {
      if (onSwipe) onSwipe(dir)
      else setGone(dir === 'bookmark' ? 'right' : dir)
    }, 350)
  }

  function reset() {
    setGone(null)
    x.set(0)
  }

  return (
    <>
      <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
        {gone ? (
          <div style={{
            height: 466, borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16,
          }}>
            <p style={{ fontSize: 32 }}>{gone === 'right' ? '❤️' : '👋'}</p>
            <p style={{ fontSize: 14, color: 'var(--text-4)', fontWeight: 500 }}>
              {gone === 'right' ? 'Saved!' : 'Passed'}
            </p>
            <button
              onClick={reset}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-2)', cursor: 'pointer',
              }}
            >
              <Undo2 size={13} /> Undo
            </button>
          </div>
        ) : (
          <motion.div
            style={{
              x, rotate, cursor: 'grab', borderRadius: 20, overflow: 'hidden',
              background: 'var(--surface)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            }}
            drag="x"
            dragConstraints={ref}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_THRESHOLD) flyOut('right')
              else if (info.offset.x < -SWIPE_THRESHOLD) flyOut('left')
              else animate(x, 0, { type: 'spring', stiffness: 350, damping: 25 })
            }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            {/* Image section — tap here to open modal */}
            <div style={{ position: 'relative' }} onClick={() => setShowModal(true)}>
              {restaurant.imageUrl ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  draggable={false}
                  style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: 380, background: 'var(--surface-warm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 80, pointerEvents: 'none',
                }}>
                  {restaurant.imageEmoji}
                </div>
              )}

              {/* Like stamp */}
              <motion.div style={{ opacity: likeOpacity, position: 'absolute', top: 24, left: 20, rotate: -15 }}>
                <div style={{
                  border: '3px solid #22c55e', borderRadius: 8, padding: '4px 12px',
                  color: '#22c55e', fontWeight: 900, fontSize: 18, letterSpacing: '0.05em',
                }}>NICE</div>
              </motion.div>

              {/* Pass stamp */}
              <motion.div style={{ opacity: passOpacity, position: 'absolute', top: 24, right: 20, rotate: 15 }}>
                <div style={{
                  border: '3px solid #ef4444', borderRadius: 8, padding: '4px 12px',
                  color: '#ef4444', fontWeight: 900, fontSize: 18, letterSpacing: '0.05em',
                }}>PASS</div>
              </motion.div>

              {/* Info overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
                padding: '44px 18px 16px',
              }}>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
                  {restaurant.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{restaurant.cuisine}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{restaurant.priceLabel}</span>
                  {restaurant.avgRating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      <Star size={13} color="#facc15" fill="#facc15" />
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{restaurant.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} color="rgba(255,255,255,0.5)" />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      {restaurant.distanceKm < 1
                        ? `${Math.round(restaurant.distanceKm * 1000)} m`
                        : `${restaurant.distanceKm.toFixed(1)} km`}
                      {' · '}{restaurant.walkMinutes} min walk
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>tap for details</span>
                </div>
              </div>
            </div>

            {/* Action buttons — inside the card, stop pointer events from triggering drag */}
            <div
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
                padding: '16px 24px 18px',
              }}
            >
              <button
                onClick={() => flyOut('left')}
                style={{
                  width: 52, height: 52, borderRadius: '50%', background: 'var(--bg)',
                  border: '1.5px solid #fecaca', color: '#ef4444', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => flyOut('bookmark')}
                style={{
                  width: 46, height: 46, borderRadius: '50%', background: 'var(--bg)',
                  border: '1.5px solid #c4b5fd', color: '#8b5cf6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Bookmark size={18} strokeWidth={2} />
              </button>
              <button
                onClick={() => flyOut('right')}
                style={{
                  width: 52, height: 52, borderRadius: '50%', background: 'var(--bg)',
                  border: '1.5px solid #bbf7d0', color: '#22c55e', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Heart size={22} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <RestaurantModal
        isOpen={showModal}
        restaurant={restaurant}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
