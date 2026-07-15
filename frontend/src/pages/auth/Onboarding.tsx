import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Indian', 'Chinese',
  'Thai', 'Mediterranean', 'American', 'Korean', 'Ethiopian',
  'French', 'Greek', 'Middle Eastern', 'Vietnamese',
]

const BUDGETS = ['$', '$$', '$$$', '$$$$']

const TRANSPORT = ['Walk', 'Transit', 'Drive']

const ADVENTURE_LEVELS = [
  { value: 'comfort_zone', emoji: '🏠', label: 'Comfort zone', desc: 'I know what I like' },
  { value: 'open_minded', emoji: '🚶', label: 'Open-minded', desc: 'New things if well-reviewed' },
  { value: 'adventurous', emoji: '🧭', label: 'Adventurous', desc: "Surprise me, I'm here for it" },
  { value: 'full_send', emoji: '🚀', label: 'Full send', desc: "I want things I've never heard of" },
]

const DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Halal',
  'Kosher', 'Nut-free', 'Pescatarian', 'None',
]

const DRAFT_KEY = 'chow_onboarding_draft'
const TOTAL_STEPS = 4

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') } catch { return {} }
}
function saveDraft(patch: object) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...loadDraft(), ...patch }))
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500,
        border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
        background: active ? 'var(--orange)' : 'var(--surface)',
        borderColor: active ? 'var(--orange)' : 'var(--border)',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >
      {label}
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const draft = loadDraft()

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [cuisines, setCuisines] = useState<string[]>(draft.cuisine_preferences ?? [])
  const [budget, setBudget] = useState<string>(draft.budget_range ?? '$$')
  const [distance, setDistance] = useState<number>(draft.max_distance_km ?? 10)
  const [transport, setTransport] = useState<string[]>(draft.transport_modes ?? [])
  const [adventureLevel, setAdventureLevel] = useState<string>(draft.adventure_level ?? '')
  const [dietary, setDietary] = useState<string[]>(draft.dietary_needs ?? [])

  function toggle<T>(list: T[], setList: (v: T[]) => void, item: T, draftKey: string) {
    const next = list.includes(item) ? list.filter(i => i !== item) : [...list, item]
    setList(next)
    saveDraft({ [draftKey]: next })
  }

  function toggleDietary(item: string) {
    const next = item === 'None'
      ? (dietary.includes('None') ? [] : ['None'])
      : [...dietary.filter(d => d !== 'None'), ...(dietary.includes(item) ? [] : [item])].filter(d => d !== item || !dietary.includes(item))
    setDietary(next)
    saveDraft({ dietary_needs: next })
  }

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/onboarding', {
        cuisine_preferences: cuisines,
        budget_range: budget,
        max_distance_km: distance,
        transport_modes: transport,
        adventure_level: adventureLevel,
        dietary_needs: dietary.filter(d => d !== 'None'),
      })
      updateUser(data)
      localStorage.removeItem(DRAFT_KEY)
      navigate('/home', { replace: true })
    } catch {
      setError('Failed to save preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canContinue = [cuisines.length > 0, true, adventureLevel !== '', true][step]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: '40px' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 99, transition: 'background 0.3s',
              background: i <= step ? 'var(--orange)' : 'var(--border)',
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {/* Step 1 — Cuisines */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                  What cuisines do you love?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Pick as many as you like.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CUISINES.map(c => (
                    <Chip key={c} label={c} active={cuisines.includes(c)}
                      onClick={() => toggle(cuisines, setCuisines, c, 'cuisine_preferences')} />
                  ))}
                </div>
                <button
                  onClick={() => { setCuisines([]); setStep(1) }}
                  style={{ marginTop: 20, fontSize: 13, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Skip for now
                </button>
              </div>
            )}

            {/* Step 2 — Budget, Distance, Transport */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                  Budget & distance
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28 }}>Set your defaults — you can always filter later.</p>

                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {BUDGETS.map(b => (
                      <button key={b} onClick={() => { setBudget(b); saveDraft({ budget_range: b }) }} style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                        border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                        background: budget === b ? 'var(--orange)' : 'var(--surface)',
                        borderColor: budget === b ? 'var(--orange)' : 'var(--border)',
                        color: budget === b ? '#fff' : 'var(--text-2)',
                      }}>{b}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max distance</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{distance} km</p>
                  </div>
                  <input type="range" min={1} max={200} value={distance}
                    onChange={e => { const v = Number(e.target.value); setDistance(v); saveDraft({ max_distance_km: v }) }}
                    style={{ width: '100%', accentColor: 'var(--orange)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>1 km</span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>200 km</span>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>How do you get around?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TRANSPORT.map(t => (
                      <button key={t} onClick={() => toggle(transport, setTransport, t, 'transport_modes')} style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                        background: transport.includes(t) ? 'var(--orange)' : 'var(--surface)',
                        borderColor: transport.includes(t) ? 'var(--orange)' : 'var(--border)',
                        color: transport.includes(t) ? '#fff' : 'var(--text-2)',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Adventure level */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                  What's your vibe?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>This shapes the restaurants we show you.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ADVENTURE_LEVELS.map(({ value, emoji, label, desc }) => (
                    <button key={value} onClick={() => { setAdventureLevel(value); saveDraft({ adventure_level: value }) }}
                      className="card"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', textAlign: 'left',
                        cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: adventureLevel === value ? 'var(--orange)' : 'var(--border)',
                        background: adventureLevel === value ? 'var(--surface-warm)' : 'var(--surface)',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{emoji}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{label}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — Dietary */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                  Any dietary needs?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Select all that apply.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DIETARY.map(d => (
                    <Chip key={d} label={d} active={dietary.includes(d)} onClick={() => toggleDietary(d)} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={step < TOTAL_STEPS - 1 ? () => setStep(s => s + 1) : submit}
            disabled={!canContinue || loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: 'var(--orange)', color: '#fff',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              opacity: !canContinue || loading ? 0.35 : 1, transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Saving…' : step === TOTAL_STEPS - 1 ? "Let's eat" : 'Continue'}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ width: '100%', padding: '10px', fontSize: 13, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
