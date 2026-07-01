import { AnimatePresence, motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { recordVisit } from '../data/restaurants'

interface Props {
  isOpen: boolean
  restaurantId: string
  restaurantName: string
  onClose: () => void
  onDone: (badges: string[]) => void
}

const WOULD_RETURN_OPTIONS: { value: 'definitely' | 'maybe' | 'probably_not'; label: string; emoji: string }[] = [
  { value: 'definitely', label: 'Definitely', emoji: '🙌' },
  { value: 'maybe', label: 'Maybe', emoji: '🤔' },
  { value: 'probably_not', label: 'Probably not', emoji: '😬' },
]

const BADGE_LABELS: Record<string, string> = {
  off_the_map: '🗺️ Off the Map — you found a hidden gem!',
  regular: '🏠 Regular — you keep coming back!',
  first_in_line: '🎉 First in Line — you were an early adopter!',
}

export default function VisitRatingModal({ isOpen, restaurantId, restaurantName, onClose, onDone }: Props) {
  const [step, setStep] = useState<'rating' | 'would_return' | 'done'>('rating')
  const [starRating, setStarRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [wouldReturn, setWouldReturn] = useState<'definitely' | 'maybe' | 'probably_not' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [badges, setBadges] = useState<string[]>([])

  async function submit(wr: 'definitely' | 'maybe' | 'probably_not') {
    setSubmitting(true)
    try {
      const res = await recordVisit(restaurantId, starRating, wr)
      setBadges(res.badgesUnlocked)
      setStep('done')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setStep('rating')
    setStarRating(0)
    setHoveredStar(0)
    setWouldReturn(null)
    setBadges([])
    onClose()
  }

  function handleDone() {
    onDone(badges)
    handleClose()
  }

  const displayStars = hoveredStar || starRating

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={step === 'done' ? handleDone : undefined}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 301, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div
              key="modal"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{
                width: '100%', maxWidth: 420,
                background: 'var(--surface)', borderRadius: 20,
                padding: '36px 32px', textAlign: 'center',
              }}
            >
              {step === 'rating' && (
                <>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>⭐</p>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                    How was {restaurantName}?
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 6, marginBottom: 28 }}>Tap a star to rate your visit</p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onMouseEnter={() => setHoveredStar(n)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setStarRating(n)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.1s' }}
                      >
                        <Star
                          size={36}
                          color="#facc15"
                          fill={n <= displayStars ? '#facc15' : 'none'}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => starRating > 0 && setStep('would_return')}
                    disabled={starRating === 0}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12,
                      background: starRating > 0 ? 'var(--orange)' : 'var(--border)',
                      color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
                      cursor: starRating > 0 ? 'pointer' : 'default', transition: 'background 0.2s',
                    }}
                  >
                    Next →
                  </button>
                </>
              )}

              {step === 'would_return' && (
                <>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>🔄</p>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                    Would you go back?
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 6, marginBottom: 28 }}>
                    {'⭐'.repeat(starRating)} — {restaurantName}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {WOULD_RETURN_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => !submitting && submit(opt.value)}
                        disabled={submitting}
                        style={{
                          padding: '14px 20px', borderRadius: 12, border: '1.5px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--text-1)', fontSize: 15, fontWeight: 600,
                          cursor: submitting ? 'default' : 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 'done' && (
                <>
                  <p style={{ fontSize: 52, marginBottom: 16 }}>🎉</p>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                    Visit logged!
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 8, marginBottom: 24 }}>
                    {restaurantName} moved to "Been here"
                  </p>

                  {badges.length > 0 && (
                    <div style={{
                      background: 'var(--bg)', border: '1.5px solid var(--orange)',
                      borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left',
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 8, letterSpacing: '0.04em' }}>
                        BADGE{badges.length > 1 ? 'S' : ''} UNLOCKED
                      </p>
                      {badges.map(b => (
                        <p key={b} style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                          {BADGE_LABELS[b] ?? b}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleDone}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12,
                      background: 'var(--orange)', color: '#fff', border: 'none',
                      fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
