import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Heart, MapPin, Star, Undo2, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface Restaurant {
  name: string
  cuisine: string
  priceScale: number
  distance: string
  rating: number
  imageUrl: string
}

const SWIPE_THRESHOLD = 80

export default function SwipeCard({ restaurant }: { restaurant: Restaurant }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [30, 100], [0, 1])
  const passOpacity = useTransform(x, [-100, -30], [1, 0])

  const [gone, setGone] = useState<'left' | 'right' | null>(null)
  const ref = useRef(null)

  function flyOut(dir: 'left' | 'right') {
    animate(x, dir === 'right' ? 600 : -600, { duration: 0.35, ease: 'easeIn' })
    setTimeout(() => setGone(dir), 350)
  }

  function reset() {
    setGone(null)
    x.set(0)
  }

  if (gone) {
    return (
      <div style={{
        height: 480, borderRadius: 20, background: '#fff',
        border: '1px solid #e4e4e7',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}>
        <p style={{ fontSize: 32 }}>{gone === 'right' ? '❤️' : '👋'}</p>
        <p style={{ fontSize: 14, color: '#a1a1aa', fontWeight: 500 }}>
          {gone === 'right' ? 'Saved!' : 'Passed'}
        </p>
        <button
          onClick={reset}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600,
            border: '1px solid #e4e4e7', background: '#fff', color: '#52525b', cursor: 'pointer',
          }}
        >
          <Undo2 size={13} /> Undo
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <motion.div
        style={{ x, rotate, cursor: 'grab', borderRadius: 20, overflow: 'hidden' }}
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
        <img
          src={restaurant.imageUrl}
          alt={restaurant.name}
          draggable={false}
          style={{ width: '100%', height: 460, objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
        />

        {/* Like stamp */}
        <motion.div style={{ opacity: likeOpacity, position: 'absolute', top: 24, left: 20, rotate: -15 }}>
          <div style={{
            border: '3px solid #22c55e', borderRadius: 8, padding: '4px 12px',
            color: '#22c55e', fontWeight: 900, fontSize: 18, letterSpacing: '0.05em',
          }}>SAVE</div>
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
          padding: '40px 20px 22px',
        }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
            {restaurant.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{restaurant.cuisine}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{'$'.repeat(restaurant.priceScale)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Star size={13} color="#facc15" fill="#facc15" />
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{restaurant.rating}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <MapPin size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{restaurant.distance}</span>
          </div>
        </div>
      </motion.div>

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20 }}>
        <button
          onClick={() => flyOut('left')}
          style={{
            width: 52, height: 52, borderRadius: '50%', background: '#fff',
            border: '1.5px solid #fecaca', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <X size={22} strokeWidth={2.5} />
        </button>
        <button
          onClick={reset}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: '#fff',
            border: '1.5px solid #e4e4e7', color: '#a1a1aa', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => flyOut('right')}
          style={{
            width: 52, height: 52, borderRadius: '50%', background: '#fff',
            border: '1.5px solid #bbf7d0', color: '#22c55e', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Heart size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
