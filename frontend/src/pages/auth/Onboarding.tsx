import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Indian', 'Thai',
  'Chinese', 'Mediterranean', 'American', 'Korean', 'French',
  'Middle Eastern', 'Vietnamese',
]

const DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Halal',
  'Kosher', 'Dairy-free', 'Nut-free',
]

const ADVENTURE_LEVELS = [
  { value: 'comfort_zone', label: 'Comfort zone', emoji: '😌', desc: 'Stick to what I know' },
  { value: 'open_minded', label: 'Open-minded', emoji: '🙂', desc: 'Willing to try new things' },
  { value: 'adventurous', label: 'Adventurous', emoji: '😎', desc: 'Bring on the unknown' },
  { value: 'full_send', label: 'Full send', emoji: '🤯', desc: 'Surprise me completely' },
]

const TOTAL_STEPS = 4

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [cuisines, setCuisines] = useState<string[]>([])
  const [budget, setBudget] = useState(2)
  const [distance, setDistance] = useState(10)
  const [adventureLevel, setAdventureLevel] = useState('')
  const [dietary, setDietary] = useState<string[]>([])

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
    else {
      // TODO: save prefs via PATCH /users/me
      navigate('/')
    }
  }

  const canContinue = [
    cuisines.length > 0,
    true,
    adventureLevel !== '',
    true,
  ][step]

  return (
    <div className="flex flex-col min-h-svh bg-white px-6 pt-12 pb-10">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? 'bg-orange-500' : 'bg-zinc-100'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col"
        >
          {step === 0 && (
            <>
              <h2 className="text-2xl font-bold text-zinc-900 mb-1">What cuisines do you love?</h2>
              <p className="text-sm text-zinc-500 mb-6">Pick as many as you like.</p>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleItem(cuisines, setCuisines, c)}
                    className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                      cuisines.includes(c)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-zinc-200 text-zinc-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-zinc-900 mb-1">Budget & distance</h2>
              <p className="text-sm text-zinc-500 mb-8">Set your defaults — you can always filter later.</p>

              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700">Budget</span>
                  <span className="text-orange-500 font-semibold">{'$'.repeat(budget)}</span>
                </div>
                <input
                  type="range" min={1} max={4} value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>Cheap eats</span><span>Fine dining</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700">Max distance</span>
                  <span className="text-orange-500 font-semibold">{distance} km</span>
                </div>
                <input
                  type="range" min={1} max={50} value={distance}
                  onChange={e => setDistance(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>1 km</span><span>50 km</span>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-zinc-900 mb-1">What's your vibe?</h2>
              <p className="text-sm text-zinc-500 mb-6">How adventurous are you feeling?</p>
              <div className="flex flex-col gap-3">
                {ADVENTURE_LEVELS.map(({ value, label, emoji, desc }) => (
                  <button
                    key={value}
                    onClick={() => setAdventureLevel(value)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                      adventureLevel === value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-zinc-900 mb-1">Any dietary needs?</h2>
              <p className="text-sm text-zinc-500 mb-6">Skip if none apply.</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleItem(dietary, setDietary, d)}
                    className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                      dietary.includes(d)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-zinc-200 text-zinc-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={next}
        disabled={!canContinue}
        className="mt-8 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white disabled:opacity-30 active:opacity-80 transition"
      >
        {step === TOTAL_STEPS - 1 ? "Let's eat" : 'Continue'}
      </button>

      {step > 0 && (
        <button
          onClick={() => setStep(s => s - 1)}
          className="mt-3 w-full py-2 text-sm text-zinc-400"
        >
          Back
        </button>
      )}
    </div>
  )
}
