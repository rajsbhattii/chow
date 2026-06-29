import { AnimatePresence, motion } from 'framer-motion'
import { Clock, ExternalLink, Heart, MapPin, Phone, Star, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { RestaurantDetail } from '../data/restaurants'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  isOpen: boolean
  restaurant: RestaurantDetail
  onClose: () => void
}

export default function RestaurantModal({ isOpen, restaurant, onClose }: Props) {
  const dayIndex = new Date().getDay()
  const today = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet positioner */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 201,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 42 }}
              style={{
                width: '100%', maxWidth: 640, maxHeight: '90vh',
                background: 'var(--surface)', borderRadius: '20px 20px 0 0',
                overflowY: 'auto', pointerEvents: 'auto',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Sticky close bar */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                  {restaurant.name}
                </p>
                <button
                  onClick={onClose}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Hero image */}
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                />

                {/* Content */}
                <div style={{ padding: '22px 24px 36px' }}>
                  {/* Name + meta */}
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {restaurant.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{restaurant.cuisine}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{'$'.repeat(restaurant.priceScale)}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={13} color="#facc15" fill="#facc15" />
                      <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>{restaurant.rating}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-4)' }}>({restaurant.reviewCount.toLocaleString()})</span>
                    </div>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="var(--text-4)" />
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{restaurant.distance}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                    {restaurant.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                        background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)',
                      }}>{tag}</span>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', margin: '22px 0' }} />

                  {/* Contact + Hours */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: 2 }}>Contact</p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <MapPin size={13} color="var(--text-4)" style={{ marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{restaurant.address}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Phone size={13} color="var(--text-4)" style={{ flexShrink: 0 }} />
                        <a href={`tel:${restaurant.phone}`} style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}>{restaurant.phone}</a>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <ExternalLink size={13} color="var(--text-4)" style={{ flexShrink: 0 }} />
                        <a href={`https://${restaurant.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}>{restaurant.website}</a>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                        <Clock size={13} color="var(--text-4)" />
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)' }}>Hours</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {DAYS.map(day => (
                          <div key={day} style={{
                            display: 'flex', justifyContent: 'space-between', fontSize: 12,
                            fontWeight: day === today ? 700 : 400,
                            color: day === today ? 'var(--text-1)' : 'var(--text-3)',
                          }}>
                            <span>{day.slice(0, 3)}</span>
                            <span>{restaurant.hours[day]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reviews */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12, letterSpacing: '-0.01em' }}>Top Reviews</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {restaurant.reviews.map((review, i) => (
                        <div key={i} className="card" style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 }}>
                            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-inverse)',
                                color: '#fff', fontSize: 12, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>{review.author[0]}</div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{review.author}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{review.date}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 1 }}>
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} size={11} color={j < review.rating ? '#facc15' : 'var(--border)'} fill={j < review.rating ? '#facc15' : 'var(--border)'} />
                              ))}
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{review.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTAs */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button style={{
                      flex: 1, padding: '13px', borderRadius: 12, background: 'var(--orange)',
                      color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      <Heart size={15} fill="#fff" /> Save
                    </button>
                    <button style={{
                      flex: 1, padding: '13px', borderRadius: 12,
                      background: 'var(--bg)', color: 'var(--text-2)',
                      border: '1px solid var(--border)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      <X size={15} /> Pass
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
