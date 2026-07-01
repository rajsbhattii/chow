import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TournamentDeck from '../components/TournamentDeck'
import { useAuth } from '../context/AuthContext'

const DEFAULT_LAT = 43.6532
const DEFAULT_LNG = -79.3832

const VIBE_META: Record<string, { label: string; emoji: string }> = {
  date_night:  { label: 'Date Night',   emoji: '🕯️' },
  quick_bite:  { label: 'Quick Bite',   emoji: '⚡'  },
  brunch:      { label: 'Brunch',       emoji: '🥂' },
  adventurous: { label: 'Adventurous',  emoji: '🗺️' },
  comfort:     { label: 'Comfort Food', emoji: '🍜' },
  group:       { label: 'Group Dinner', emoji: '🥳' },
}

export default function Tournament() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const vibe = params.get('vibe') ?? ''
  const meta = VIBE_META[vibe] ?? { label: 'Tournament', emoji: '🏆' }

  const [ready, setReady] = useState(false)
  const coords = useRef({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setReady(true)
      },
      () => setReady(true),
      { timeout: 5000 },
    )
  }, [])

  if (!ready) return null

  return (
    <div className="page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <TournamentDeck
        vibe={vibe}
        vibeLabel={meta.label}
        vibeEmoji={meta.emoji}
        lat={coords.current.lat}
        lng={coords.current.lng}
        maxDistanceKm={user?.max_distance ?? 25}
        onExit={() => navigate('/home')}
        onNavigateSaved={() => navigate('/saved')}
      />
    </div>
  )
}
