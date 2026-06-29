import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Heart, MapPin, Star, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { RestaurantDetail } from '../data/restaurants'

interface Props {
  isOpen: boolean
  restaurant: RestaurantDetail
  onClose: () => void
}

export default function RestaurantModal({ isOpen, restaurant, onClose }: Props) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
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
              {/* Sticky header */}
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

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Hero */}
                {restaurant.imageUrl ? (
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 260, background: 'var(--surface-warm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80,
                  }}>
                    {restaurant.imageEmoji}
                  </div>
                )}

                <div style={{ padding: '22px 24px 36px' }}>
                  {/* Name + meta */}
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
                          <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>
                            {restaurant.avgRating.toFixed(1)}
                          </span>
                          {restaurant.reviewCount && (
                            <span style={{ fontSize: 13, color: 'var(--text-4)' }}>
                              ({restaurant.reviewCount.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="var(--text-4)" />
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {restaurant.distanceKm < 1
                          ? `${Math.round(restaurant.distanceKm * 1000)} m`
                          : `${restaurant.distanceKm.toFixed(1)} km`}
                        {' · '}{restaurant.walkMinutes} min walk
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {restaurant.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                      {restaurant.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                          background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)',
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border)', margin: '22px 0' }} />

                  {/* Location + website */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {restaurant.neighbourhood && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <MapPin size={13} color="var(--text-4)" style={{ marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                          {restaurant.neighbourhood}{restaurant.location ? ` · ${restaurant.location}` : ''}
                        </p>
                      </div>
                    )}
                    {restaurant.website && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <ExternalLink size={13} color="var(--text-4)" style={{ flexShrink: 0 }} />
                        <a
                          href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}
                        >
                          {restaurant.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {restaurant.busyHours && typeof restaurant.busyHours === 'string' && (
                      <p style={{ fontSize: 13, color: 'var(--text-4)' }}>⏰ {restaurant.busyHours}</p>
                    )}
                  </div>

                  {/* CTAs */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                    <button style={{
                      flex: 1, padding: '13px', borderRadius: 12, background: 'var(--orange)',
                      color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      <Heart size={15} fill="#fff" /> Save
                    </button>
                    <button
                      onClick={onClose}
                      style={{
                        flex: 1, padding: '13px', borderRadius: 12,
                        background: 'var(--bg)', color: 'var(--text-2)',
                        border: '1px solid var(--border)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      }}
                    >
                      <X size={15} /> Close
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
