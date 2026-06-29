import { ArrowLeft, Clock, ExternalLink, Heart, MapPin, Phone, Star, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRestaurantById } from '../data/restaurants'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const restaurant = id ? getRestaurantById(id) : undefined

  if (!restaurant) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🍽️</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>Restaurant not found</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 20, padding: '10px 24px', borderRadius: 10,
            background: 'var(--orange)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          Back to home
        </button>
      </div>
    )
  }

  const dayIndex = new Date().getDay()
  const today = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]

  return (
    <div>
      {/* Hero */}
      <div style={{ position: 'relative', height: 400, overflow: 'hidden' }}>
        <img
          src={restaurant.imageUrl}
          alt={restaurant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }} />
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: 20, left: 24,
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="page" style={{ display: 'flex', gap: 48, alignItems: 'flex-start', paddingTop: 32 }}>

        {/* Left: main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.1 }}>
            {restaurant.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{restaurant.cuisine}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{'$'.repeat(restaurant.priceScale)}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={14} color="#facc15" fill="#facc15" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{restaurant.rating}</span>
              <span style={{ fontSize: 13, color: 'var(--text-4)' }}>({restaurant.reviewCount.toLocaleString()} reviews)</span>
            </div>
            <span style={{ color: 'var(--border)' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color="var(--text-4)" />
              <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{restaurant.distance}</span>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {restaurant.tags.map(tag => (
              <span key={tag} style={{
                padding: '5px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Reviews */}
          <div style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 20 }}>
              Top Reviews
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {restaurant.reviews.map((review, i) => (
                <div key={i} className="card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--surface-inverse)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff',
                        flexShrink: 0,
                      }}>
                        {review.author[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{review.author}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 1 }}>{review.date}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          size={13}
                          color={j < review.rating ? '#facc15' : 'var(--border)'}
                          fill={j < review.rating ? '#facc15' : 'var(--border)'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: sidebar */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Contact + Hours card */}
          <div className="card" style={{ padding: '22px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={15} color="var(--text-4)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>Address</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{restaurant.address}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Phone size={15} color="var(--text-4)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>Phone</p>
                  <a
                    href={`tel:${restaurant.phone}`}
                    style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}
                  >
                    {restaurant.phone}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ExternalLink size={15} color="var(--text-4)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>Website</p>
                  <a
                    href={`https://${restaurant.website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}
                  >
                    {restaurant.website}
                  </a>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={15} color="var(--text-4)" />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Hours</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {DAYS.map(day => (
                  <div
                    key={day}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 13,
                      fontWeight: day === today ? 600 : 400,
                      color: day === today ? 'var(--text-1)' : 'var(--text-3)',
                    }}
                  >
                    <span>{day.slice(0, 3)}</span>
                    <span>{restaurant.hours[day]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <button style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'var(--orange)', color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Heart size={16} fill="#fff" /> Save
          </button>

          <button style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'var(--surface)', color: 'var(--text-2)',
            border: '1px solid var(--border)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <X size={16} /> Pass
          </button>

        </div>
      </div>
    </div>
  )
}
