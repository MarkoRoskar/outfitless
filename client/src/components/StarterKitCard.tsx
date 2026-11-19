import { useState } from 'react'
import api, { isUnauthorized } from '../lib/axios'
import { accentButton, card, eyebrow, secondaryButton } from '../lib/styles'
import { useAuthStore } from '../store/authStore'
import { PlayIcon } from './icons'
import Reveal from './Reveal'

// What's in the kit, as the server adds it (starterWorkouts in the server's starter.service.ts)
const kit = [
  { name: 'Push Day', exercises: 'Bench Press, Overhead Press, Incline Dumbbell Press, Lateral Raise, Triceps Pushdown' },
  { name: 'Pull Day', exercises: 'Pull-up, Barbell Row, Lat Pulldown, Face Pull, Dumbbell Curl' },
  { name: 'Leg Day', exercises: 'Squat, Romanian Deadlift, Leg Press, Standing Calf Raise, Hanging Leg Raise' },
]

// The home screen's offer to a brand-new account: a ready Push / Pull / Legs routine in one tap,
// so the app isn't empty on day one. Adding it creates the exercises, workouts and routine and
// follows the routine, then onAdded reloads the home screen, which shows Push Day as next up.
// "I'll make my own" hides it, and the usual first step shows instead.
export default function StarterKitCard({ onAdded, onSkip }: { onAdded: () => void; onSkip: () => void }) {
  const { logout } = useAuthStore()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function add() {
    setError('')
    setAdding(true)
    try {
      await api.post('/starter-kit')
      onAdded()
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError('Could not add the starter kit. Please try again.')
      setAdding(false)
    }
  }

  return (
    // Black from the top left like Next up, since it's in the same place: the next thing to do
    <Reveal variant="pop" className={`${card} flex flex-col gap-4 bg-linear-to-br from-black/85 via-black/35 to-white/6`}>
      <div className="flex flex-col gap-1.5">
        <p className={eyebrow}>New here?</p>
        <h2 className="text-lg font-semibold tracking-tight">Start with a ready plan</h2>
        <p className="text-sm text-zinc-400 max-w-[60ch]">
          A Push / Pull / Legs routine with 15 common exercises, each with a plan. The weights start
          light: change them to suit you, and they go up as you get stronger.
        </p>
      </div>

      {/* The three workouts and what's in each, numbered like a routine */}
      <ol className="flex flex-col gap-2">
        {kit.map((workout, index) => (
          <li key={workout.name} className="flex items-baseline gap-2.5 min-w-0">
            <span className="shrink-0 text-xs font-mono font-bold text-accent-dim">{index + 1}</span>
            <p className="min-w-0 text-sm">
              <span className="font-semibold text-zinc-50">{workout.name}</span>
              <span className="text-zinc-400"> · {workout.exercises}</span>
            </p>
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={add} disabled={adding} className={`inline-flex items-center gap-2 ${accentButton}`}>
          {!adding && <PlayIcon size={14} />}
          {adding ? 'Adding…' : 'Add the starter kit'}
        </button>
        <button onClick={onSkip} disabled={adding} className={`${secondaryButton} disabled:opacity-50`}>
          I'll make my own
        </button>
      </div>
    </Reveal>
  )
}
