import { useState } from 'react'
import api, { isUnauthorized } from '../lib/axios'
import { MAX_REPS, MAX_WEIGHT } from '../lib/limits'
import { formatDay } from '../lib/dates'
import { fieldClass, primaryButton, secondaryButton } from '../lib/styles'
import { useAuthStore } from '../store/authStore'
import { CheckIcon } from './icons'
import Modal from './Modal'
import type { FinishedSession } from './WorkoutHistory'

// One set while editing. Numbers stay strings while typing, like the other forms.
interface DraftSet {
  reps: string
  weight: string
  done: boolean
}

// Corrects the sets of a finished workout: each set's reps and weight, and whether it was done.
// Sets can't be added or removed. If this is the workout's most recent session, the server works
// out the targets again from the corrected sets, and onSaved hears about it.
export default function EditSessionDialog({ session, onClose, onSaved }: {
  session: FinishedSession
  onClose: () => void
  onSaved: (session: FinishedSession, targetsUpdated: boolean) => void
}) {
  const { logout } = useAuthStore()
  const [drafts, setDrafts] = useState<DraftSet[][]>(() =>
    session.exercises.map((exercise) =>
      exercise.loggedSets.map((set) => ({ reps: String(set.reps), weight: String(set.weight ?? 0), done: set.done }))
    )
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // After a save with a number that's wrong, each such set says under it what to fix
  const [tried, setTried] = useState(false)

  function change(exerciseIndex: number, setIndex: number, update: Partial<DraftSet>) {
    setDrafts((current) => current.map((sets, i) =>
      i === exerciseIndex ? sets.map((set, j) => (j === setIndex ? { ...set, ...update } : set)) : sets
    ))
  }

  const repsValid = (value: string) => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= MAX_REPS
  const weightValid = (value: string) => value !== '' && Number(value) >= 0 && Number(value) <= MAX_WEIGHT
  const allValid = drafts.every((sets, i) =>
    sets.every((set) => repsValid(set.reps) && (session.exercises[i].noWeight || weightValid(set.weight)))
  )

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allValid) {
      setTried(true)
      return
    }
    setError('')
    setSaving(true)
    try {
      const exercises = drafts.map((sets, i) => ({
        loggedSets: sets.map((set) => ({
          reps: Number(set.reps),
          done: set.done,
          ...(session.exercises[i].noWeight ? {} : { weight: Number(set.weight) }),
        })),
      }))
      const { data } = await api.put<{ session: FinishedSession; targetsUpdated: boolean }>(`/sessions/${session._id}/sets`, { exercises })
      onSaved(data.session, data.targetsUpdated)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError('Could not save the changes. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit workout" busy={saving} onClose={onClose}>
      {/* noValidate: the sets say what to fix under them, instead of the browser's bubbles */}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="-mt-2 text-sm text-zinc-400 wrap-break-word">
          {session.workoutName} · {formatDay(session.finishedAt)}
        </p>

        {session.exercises.map((exercise, exerciseIndex) => (
          <fieldset key={exerciseIndex} className="flex flex-col gap-2 min-w-0">
            <legend title={exercise.name} className="mb-2 text-sm font-semibold truncate max-w-full">{exercise.name}</legend>
            <ol className="flex flex-col gap-2">
              {drafts[exerciseIndex].map((set, setIndex) => {
                const label = `set ${setIndex + 1} of ${exercise.name}`
                const badReps = !repsValid(set.reps)
                const badWeight = !exercise.noWeight && !weightValid(set.weight)
                const fix = [
                  badReps && `Reps: a whole number from 0 to ${MAX_REPS}.`,
                  badWeight && `Weight: a number from 0 to ${MAX_WEIGHT} kg.`,
                ].filter(Boolean).join(' ')
                return (
                  <li key={setIndex} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-xs font-mono font-bold text-accent-dim">{setIndex + 1}</span>
                    <input
                      type="number"
                      min={0}
                      value={set.reps}
                      onChange={(e) => change(exerciseIndex, setIndex, { reps: e.target.value })}
                      aria-label={`Reps for ${label}`}
                      aria-invalid={tried && badReps}
                      className={`h-10 min-w-0 flex-1 tabular-nums ${fieldClass}`}
                    />
                    <span className="shrink-0 text-xs text-zinc-400">reps</span>
                    {!exercise.noWeight && (
                      <>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={set.weight}
                          onChange={(e) => change(exerciseIndex, setIndex, { weight: e.target.value })}
                          aria-label={`Weight in kg for ${label}`}
                          aria-invalid={tried && badWeight}
                          className={`h-10 min-w-0 flex-1 tabular-nums ${fieldClass}`}
                        />
                        <span className="shrink-0 text-xs text-zinc-400">kg</span>
                      </>
                    )}
                    {/* The same tick as during a workout: filled when the set counts as done */}
                    <button
                      type="button"
                      onClick={() => change(exerciseIndex, setIndex, { done: !set.done })}
                      aria-pressed={set.done}
                      aria-label={set.done ? `Mark ${label} as not done` : `Mark ${label} as done`}
                      className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border transition-colors duration-200 ${
                        set.done
                          ? 'border-accent-dim bg-accent-dim text-black'
                          : 'border-white/10 text-zinc-400 hover:border-accent-dim hover:text-accent-dim'
                      }`}
                    >
                      <CheckIcon size={18} />
                    </button>
                  </div>
                  {tried && fix && <p role="alert" className="pl-6 text-xs text-red-500">{fix}</p>}
                  </li>
                )
              })}
            </ol>
          </fieldset>
        ))}

        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
