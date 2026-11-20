import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api, { isUnauthorized } from '../lib/axios'
import { MAX_REPS, MAX_WEIGHT } from '../lib/limits'
import { clearSetDrafts, loadSetDraft, saveSetDraft } from '../lib/setDrafts'
import { isRestSoundOn, playFinishSound, playRestEndSound, setRestSoundOn, unlockSound } from '../lib/sound'
import { useWakeLock } from '../lib/useWakeLock'
import { accentButton, accentSecondaryButton, card, dangerSecondaryButton, fieldClass, secondaryButton, pageTitle, softPill } from '../lib/styles'
import BackLink from '../components/BackLink'
import Confetti from '../components/Confetti'
import RecordBadge from '../components/RecordBadge'
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, CloseIcon, NoteIcon, SoundOffIcon, SoundOnIcon } from '../components/icons'
import { useAuthStore } from '../store/authStore'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import LoadError from '../components/LoadError'
import PageHelp from '../components/PageHelp'
import { helpText } from '../lib/helpText'
import Loading from '../components/Loading'
import Reveal from '../components/Reveal'
import { listRevealDelay } from '../lib/useReveal'
import { nextCurrentNumbers } from '../lib/progression'

interface LoggedSet {
  reps: number
  weight?: number
  done: boolean
}

// A copy of the plan, made when the workout started
interface SessionExercise {
  name: string
  note?: string
  sets: number
  minReps?: number
  maxReps?: number
  amrap: boolean
  noWeight: boolean
  restTime: number
  loggedSets: LoggedSet[]
  // What was logged the previous time. Missing from sessions started before this was added.
  lastSets?: { reps: number; weight?: number }[]
  // The target when the session started, shown under sets with no "Last time". Missing from older sessions.
  targetReps?: number
  targetWeight?: number
  // How much the weight goes up or down. Missing for no-weight and max-rep exercises.
  weightIncrement?: number
  // On a finished session: the set that's a personal record, if any
  recordSetIndex?: number
}

interface Session {
  _id: string
  workoutId: string
  workoutName: string
  workoutNote?: string
  restBetweenExercises: number
  finishedAt: string | null
  exercises: SessionExercise[]
}

// How finishing changed one exercise's current numbers. The reps are missing if the exercise
// was removed from the workout meanwhile.
interface WeightChange {
  exerciseIndex: number
  weightChange: number
  repsBefore?: number
  repsAfter?: number
}

// The summary line for one exercise, and whether it's worth highlighting
function describeChange(exercise: SessionExercise, logged: number, change: WeightChange | undefined) {
  // Nothing was logged, so nothing was evaluated
  if (logged === 0) return { text: 'Not logged', highlight: false }

  // Max-rep targets never change by themselves
  if (exercise.amrap) return { text: 'Target stays', highlight: false }

  // Without weight, progress shows as more target reps
  if (exercise.noWeight) {
    const { repsBefore, repsAfter } = change ?? {}
    if (repsBefore === undefined || repsAfter === undefined || repsBefore === repsAfter) {
      return { text: 'No change', highlight: false }
    }
    return { text: `Reps ${repsBefore} → ${repsAfter}`, highlight: true }
  }

  const weightChange = change?.weightChange ?? 0
  if (weightChange !== 0) {
    return { text: `${weightChange > 0 ? '+' : '−'}${Math.abs(weightChange)} kg`, highlight: true }
  }
  // Same weight, but the target reps can still move, like 20 kg × 8 becoming 20 kg × 10
  const { repsBefore, repsAfter } = change ?? {}
  if (repsBefore !== undefined && repsAfter !== undefined && repsBefore !== repsAfter) {
    return { text: `Reps ${repsBefore} → ${repsAfter}`, highlight: true }
  }
  return { text: 'No change', highlight: false }
}

// Shown once a workout is finished, to explain what happened to the current weights
function FinishSummary({ session, changes }: { session: Session; changes: WeightChange[] }) {
  const allSets = session.exercises.flatMap((exercise) => exercise.loggedSets)
  // Exercises whose target changed come first, since they're the news. Each group keeps the
  // workout's order (sort is stable).
  const rows = session.exercises
    .map((exercise, exerciseIndex) => {
      const logged = exercise.loggedSets.filter((set) => set.done).length
      const result = describeChange(exercise, logged, changes.find((item) => item.exerciseIndex === exerciseIndex))
      return { exercise, exerciseIndex, logged, result }
    })
    // Personal records first, then changed targets, since those are the news
    .sort((a, b) =>
      Number(b.exercise.recordSetIndex !== undefined) - Number(a.exercise.recordSetIndex !== undefined) ||
      Number(b.result.highlight) - Number(a.result.highlight))

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      {/* A win: confetti fires once the summary is on screen */}
      <Confetti delay={150} />

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-lg mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-6">
        {/* Laid out like a workout's page: the title, then a line of details. Done below leads back. */}
        <Reveal onLoad className="min-w-0 flex flex-col gap-2">
          <h1 title={session.workoutName} className={`${pageTitle} truncate`}>{session.workoutName}</h1>
          <p className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
            <span className={softPill}>Finished</span>
            {allSets.filter((set) => set.done).length} of {allSets.length} sets completed
          </p>
        </Reveal>

        <ul className="flex flex-col gap-2">
          {rows.map(({ exercise, exerciseIndex, logged, result }, index) => {
            // A record celebrates once its card has popped in
            const cardDelay = 80 + listRevealDelay(index)
            const recordDelay = cardDelay + 350
            return (
              <Reveal as="li" key={exerciseIndex} variant="pop" delay={cardDelay} className={`${card} flex items-center justify-between gap-4`}>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="min-w-0 flex items-center gap-2">
                    <h2 title={exercise.name} className="min-w-0 text-sm font-semibold truncate">{exercise.name}</h2>
                    {exercise.recordSetIndex !== undefined && <span className="shrink-0"><RecordBadge celebrateDelay={recordDelay} /></span>}
                  </div>
                  <p className="text-xs text-zinc-400 tabular-nums">
                    {logged} of {exercise.loggedSets.length} {exercise.loggedSets.length === 1 ? 'set' : 'sets'}
                    {/* The record itself, so it's clear what was beaten */}
                    {exercise.recordSetIndex !== undefined && exercise.loggedSets[exercise.recordSetIndex] && (
                      <span className="ml-3 text-accent-dim record-glow" style={{ '--record-delay': `${recordDelay}ms` } as CSSProperties}>
                        New best: {describeSet(exercise.loggedSets[exercise.recordSetIndex])}
                      </span>
                    )}
                  </p>
                </div>
                <p className={`shrink-0 tabular-nums ${result.highlight ? 'text-sm font-semibold' : 'text-xs text-zinc-400'}`}>
                  {result.text}
                </p>
              </Reveal>
            )
          })}
        </ul>

        <Reveal delay={200} className="flex flex-col">
          <Link to={`/workouts/${session.workoutId}`} replace className={`inline-flex items-center justify-center ${accentButton}`}>
            Done
          </Link>
        </Reveal>
      </main>
    </div>
  )
}

// Counts down in the browser only, so a reload clears it
// The top of an exercise's card: its name on one line and its note on two. When either is cut
// off, tapping the header (or the chevron) shows all of it. Short ones have nothing to open, so
// they get no chevron and the header isn't tappable.
// What finishing will do to an exercise's target, once all its sets are ticked, worked out by
// the same rule as the server's (lib/progression.ts) and worded like the summary at the end:
// "+2.5 kg next time", "Reps 8 → 10 next time". Null until every set is ticked, and for older
// workouts that didn't save the target they started from.
function nextTimeChange(exercise: SessionExercise) {
  if (!exercise.loggedSets.every((set) => set.done)) return null
  if (exercise.amrap) return { text: 'Target stays', highlight: false }
  if (exercise.targetReps === undefined || (!exercise.noWeight && exercise.targetWeight === undefined)) return null
  const next = nextCurrentNumbers(exercise)
  if (!next) return null
  const result = describeChange(exercise, exercise.loggedSets.length, {
    exerciseIndex: 0,
    weightChange: exercise.noWeight ? 0 : Math.round(((next.currentWeight ?? 0) - (exercise.targetWeight ?? 0)) * 100) / 100,
    repsBefore: exercise.targetReps,
    repsAfter: next.currentReps,
  })
  return { text: result.highlight ? `${result.text} next time` : 'Same target next time', highlight: result.highlight }
}

function ExerciseHeader({ exercise }: { exercise: SessionExercise }) {
  const change = nextTimeChange(exercise)
  const [open, setOpen] = useState(false)
  const [cutOff, setCutOff] = useState(false)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const noteRef = useRef<HTMLParagraphElement>(null)

  // Measured while closed, whenever the width changes and again once the font has loaded,
  // since the text's width depends on both. While open, the last answer is kept.
  useEffect(() => {
    if (open) return
    function measure() {
      const overflows = (el: HTMLElement | null) => !!el && el.scrollHeight > el.clientHeight + 1
      setCutOff(overflows(nameRef.current) || overflows(noteRef.current))
    }
    measure()
    let ignore = false
    document.fonts?.ready.then(() => { if (!ignore) measure() })
    const observer = new ResizeObserver(measure)
    if (nameRef.current) observer.observe(nameRef.current)
    return () => { ignore = true; observer.disconnect() }
  }, [open, exercise.name, exercise.note])

  const toggle = () => { if (cutOff) setOpen((current) => !current) }

  return (
    <div
      onClick={toggle}
      className={`flex items-start gap-2 ${cutOff ? 'cursor-pointer' : ''}`}
    >
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <h2 ref={nameRef} className={`text-base font-semibold tracking-tight wrap-break-word ${open ? '' : 'line-clamp-1'}`}>
          {exercise.name}
        </h2>
        {/* Written the same way as on the workout's page: "3 sets   8–12 reps", numbers in white */}
        <p className="flex gap-x-3 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
          <span><span className="font-semibold text-zinc-50">{exercise.sets}</span> {exercise.sets === 1 ? 'set' : 'sets'}</span>
          <span>
            <span className="font-semibold text-zinc-50">{exercise.amrap ? 'max' : `${exercise.minReps}–${exercise.maxReps}`}</span> reps
          </span>
        </p>
        {/* The target this workout started with, written like on the workout's page */}
        {exercise.targetReps !== undefined && (exercise.noWeight || exercise.targetWeight !== undefined) && (
          <p className="mt-0.5 flex items-baseline gap-2 leading-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Target</span>
            <span className="text-sm font-semibold tabular-nums text-accent-dim">
              {describeSet({ reps: exercise.targetReps, weight: exercise.noWeight ? undefined : exercise.targetWeight })}
            </span>
          </p>
        )}
        {exercise.note && (
          <p ref={noteRef} className={`mt-1 text-sm text-zinc-400 whitespace-pre-line wrap-break-word ${open ? '' : 'line-clamp-2'}`}>
            {exercise.note}
          </p>
        )}
      </div>
      {/* Pops in at the top right once the last set is ticked, like on the homepage. Green when
          the target moves, gray when it stays. */}
      {change && (
        <span
          role="status"
          className={`next-time-chip shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[12px] font-semibold ${
            change.highlight ? 'bg-accent text-black' : 'bg-zinc-800 text-zinc-100 ring-1 ring-white/10'
          }`}
        >
          {change.text}
        </span>
      )}
      {cutOff && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggle() }}
          aria-expanded={open}
          aria-label={open ? `Show less of ${exercise.name}` : `Show all of ${exercise.name}`}
          className="shrink-0 -mr-1.5 -mt-0.5 h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-white/8 transition-colors duration-200"
        >
          <ChevronDownIcon size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}

// Counts down, beeps at 0:00 (if switched on) and stays there until closed, or until the next
// set starts a new rest. onClose is Skip while counting and × at 0:00.
function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    // Based on the clock, because browsers slow down timers in background tabs
    const endsAt = Date.now() + seconds * 1000
    const timer = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000)
      if (left <= 0) {
        clearInterval(timer)
        setRemaining(0)
        playRestEndSound()
      } else {
        setRemaining(left)
      }
    }, 250)

    return () => clearInterval(timer)
  }, [seconds])

  const minutes = Math.floor(remaining / 60)
  const secondsLeft = String(remaining % 60).padStart(2, '0')
  // The beep at the end, switched here or in Settings. Saved on this device.
  const [soundOn, setSoundOn] = useState(isRestSoundOn)
  function toggleSound() {
    setRestSoundOn(!soundOn)
    setSoundOn(!soundOn)
  }

  return (
    // On phones it sits above the tab bar, which is about 4rem tall. The light green border sets it
    // apart from the exercise cards it floats over, and
    // unlike other cards it is solid, so the set rows scrolling under it don't show through.
    // At 0:00 it glows green and gives a little shake (rest-done in index.css), then stays, with
    // the green border gone (a plain one of the same width, so nothing moves) like on the homepage
    <div role="timer" className={`${card} bg-zinc-900! border sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 z-10 flex items-center justify-between gap-4 shadow-lg ${remaining === 0 ? 'rest-done border-white/6' : 'border-accent-dim'}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-zinc-400">Rest</span>
        {/* Each of the last 3 seconds pulses, like the homepage's timer. The key changes every
            second, so the pulse plays again each time. */}
        <span
          key={remaining}
          className={`inline-block origin-left font-mono text-xl font-semibold text-accent tabular-nums ${
            remaining > 0 && remaining <= 3 ? 'timer-pulse' : ''
          }`}
        >
          {minutes}:{secondsLeft}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {remaining > 0 ? (
          <>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!soundOn}
              aria-label={soundOn ? 'Mute the beep' : 'Turn the beep on'}
              title={soundOn ? 'Mute the beep' : 'Turn the beep on'}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-50 transition-colors duration-200"
            >
              {soundOn ? <SoundOnIcon size={18} /> : <SoundOffIcon size={18} />}
            </button>
            <button onClick={onClose} className={secondaryButton}>Skip</button>
          </>
        ) : (
          // The rest is over: the beep has played and there's nothing to skip, so only closing is left
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the rest timer"
            title="Close"
            className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-50 transition-colors duration-200"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

// "60 kg × 10", or "10 reps" without a weight
function describeSet({ reps, weight }: { reps: number; weight?: number }) {
  return weight === undefined ? `${reps} reps` : `${weight} kg × ${reps}`
}

// One set's inputs. Numbers are kept as strings while typing, like the other forms.
function SetRow({ sessionId, exerciseIndex, setIndex, set, last, target, noWeight, exerciseName, onToggle }: {
  sessionId: string
  exerciseIndex: number
  setIndex: number
  set: LoggedSet
  last?: { reps: number; weight?: number }
  // Shown instead of last when this set has no history yet, like the first time doing a workout
  target?: { reps: number; weight?: number }
  noWeight: boolean
  exerciseName: string
  onToggle: (reps: number, weight: number | undefined, done: boolean) => void
}) {
  // A ticked set is saved on the server, so only an unticked one uses its draft
  const [draft] = useState(() => (set.done ? null : loadSetDraft(sessionId, exerciseIndex, setIndex)))
  const [reps, setReps] = useState(draft?.reps ?? String(set.reps))
  const [weight, setWeight] = useState(draft?.weight ?? String(set.weight ?? 0))
  const number = setIndex + 1

  function changeReps(value: string) {
    setReps(value)
    saveSetDraft(sessionId, exerciseIndex, setIndex, { reps: value, weight })
  }

  function changeWeight(value: string) {
    setWeight(value)
    saveSetDraft(sessionId, exerciseIndex, setIndex, { reps, weight: value })
  }

  const repsValid = reps !== '' && Number.isInteger(Number(reps)) && Number(reps) >= 0 && Number(reps) <= MAX_REPS
  const weightValid = noWeight || (weight !== '' && Number(weight) >= 0 && Number(weight) <= MAX_WEIGHT)
  const label = `set ${number} of ${exerciseName}`

  // Set by ticking the set, until its animation has played: the button squashes and springs back
  // and the row flashes green (set-tick and set-row-flash in index.css). Not on unticking, and
  // not for sets already done when the page opens.
  const [justTicked, setJustTicked] = useState(false)

  return (
    <li className="flex flex-col gap-1">
      {/* The negative margin and padding give the flash room around the row without moving it */}
      <div
        onAnimationEnd={(e) => { if (e.animationName === 'set-row-flash') setJustTicked(false) }}
        className={`-mx-2 px-2 -my-1 py-1 rounded-xl flex items-center gap-2 ${justTicked ? 'set-row-flash' : ''}`}
      >
      <span className="w-4 shrink-0 text-xs font-mono font-bold text-accent-dim">{number}</span>
      <input
        type="number"
        min={0}
        value={reps}
        onChange={(e) => changeReps(e.target.value)}
        disabled={set.done}
        aria-label={`Reps for ${label}`}
        // On phones the boxes share the row; on wider screens they stay number-sized instead of stretching
        className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 tabular-nums disabled:opacity-60 ${fieldClass}`}
      />
      <span className="shrink-0 text-xs text-zinc-400">reps</span>
      {!noWeight && (
        <>
          <input
            type="number"
            min={0}
            step="any"
            value={weight}
            onChange={(e) => changeWeight(e.target.value)}
            disabled={set.done}
            aria-label={`Weight in kg for ${label}`}
            className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 tabular-nums disabled:opacity-60 ${fieldClass}`}
          />
          <span className="shrink-0 text-xs text-zinc-400">kg</span>
        </>
      )}
      <button
        onClick={() => {
          setJustTicked(!set.done)
          onToggle(Number(reps), noWeight ? undefined : Number(weight), !set.done)
        }}
        disabled={!repsValid || !weightValid}
        aria-pressed={set.done}
        aria-label={set.done ? `Undo ${label}` : `Log ${label}`}
        className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
          justTicked ? 'set-tick' : ''
        } ${
          set.done
            ? 'border-accent-dim bg-accent-dim text-black'
            : 'border-white/10 text-zinc-400 hover:border-accent-dim hover:text-accent-dim'
        }`}
      >
        <CheckIcon size={18} />
      </button>
      </div>
      {(last ?? target) && (
        <p className="pl-6 text-xs text-zinc-400 tabular-nums">
          {last ? 'Last time' : 'Target'}: {describeSet((last ?? target)!)}
        </p>
      )}
    </li>
  )
}

// A workout in progress: log each set, then finish or discard
export default function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, logout } = useAuthStore()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  // The rest to count down. id restarts the timer when the same rest comes twice in a row.
  const [rest, setRest] = useState<{ seconds: number; id: number } | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [finishing, setFinishing] = useState(false)
  // Set once the workout is finished, which switches the page to the summary
  const [changes, setChanges] = useState<WeightChange[] | null>(null)
  const [discarding, setDiscarding] = useState(false)
  // Sets still being saved, which finishing has to wait for. Each one resolves to whether it saved.
  const pendingSaves = useRef(new Set<Promise<boolean>>())

  // A locked phone can pause the rest timer and its beep
  useWakeLock(status === 'ready' && !changes && !session?.finishedAt)

  useEffect(() => {
    if (!token) return
    let ignore = false

    api.get<Session>(`/sessions/${id}`)
      .then(({ data }) => {
        if (ignore) return
        setSession(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        // The server answers 400 for a malformed ID and 404 for an unknown one
        else if (isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 404)) setStatus('notFound')
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [token, id, attempt, logout])

  // The login page brings the user straight back here
  if (!token) return <Navigate to="/login" replace state={{ returnTo: `/sessions/${id}` }} />

  // A finished workout can't be logged any more, for example after pressing the browser's back button.
  // Right after finishing here, though, the summary below is shown instead.
  if (session?.finishedAt && !changes) return <Navigate to={`/workouts/${session.workoutId}`} replace />

  // With the numbers as typed, so the next-time chip works from what was logged rather than the
  // numbers the set started with
  function setDone(exerciseIndex: number, setIndex: number, done: boolean, values?: { reps: number; weight: number | undefined }) {
    setSession((current) => current && {
      ...current,
      exercises: current.exercises.map((exercise, i) => i !== exerciseIndex ? exercise : {
        ...exercise,
        loggedSets: exercise.loggedSets.map((set, j) => (j === setIndex ? { ...set, ...values, done } : set)),
      }),
    })
  }

  // Between sets it's the exercise's rest, then the workout's rest, and nothing after the very last set
  function restAfter(current: Session, exerciseIndex: number, setIndex: number) {
    const exercise = current.exercises[exerciseIndex]
    if (setIndex < exercise.loggedSets.length - 1) return exercise.restTime
    if (exerciseIndex < current.exercises.length - 1) return current.restBetweenExercises
    return 0
  }

  async function saveSet(exerciseIndex: number, setIndex: number, reps: number, weight: number | undefined, done: boolean) {
    try {
      await api.patch(`/sessions/${id}/sets`, { exerciseIndex, setIndex, reps, weight, done })
      return true
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return false
      }
      setDone(exerciseIndex, setIndex, !done)
      setRest(null)
      setError('Could not save that set. Please try again.')
      return false
    }
  }

  // The tick shows right away, and goes back if the server can't save the set
  function toggleSet(exerciseIndex: number, setIndex: number, reps: number, weight: number | undefined, done: boolean) {
    if (!session || finishing) return
    const seconds = done ? restAfter(session, exerciseIndex, setIndex) : 0

    unlockSound()
    setError('')
    setDone(exerciseIndex, setIndex, done, { reps, weight })
    setRest((current) => (seconds > 0 ? { seconds, id: (current?.id ?? 0) + 1 } : null))

    const save = saveSet(exerciseIndex, setIndex, reps, weight, done)
    pendingSaves.current.add(save)
    save.then(() => pendingSaves.current.delete(save))
  }

  async function finish() {
    if (!session) return
    setError('')
    setFinishing(true)
    // This click is what lets the browser play the finish sound once the server answers
    unlockSound()

    // Otherwise a set that's still saving would be left out of the progression.
    // If one fails, stop here so its error shows and it can be logged again.
    const saves = await Promise.all(pendingSaves.current)
    if (saves.includes(false)) {
      setConfirmingFinish(false)
      setFinishing(false)
      return
    }

    try {
      const { data } = await api.post<{ session?: Session; changes: WeightChange[] }>(`/sessions/${id}/finish`)
      clearSetDrafts(session._id)
      setRest(null)
      setConfirmingFinish(false)
      // The finished session from the server, which marks any personal records for the summary
      if (data.session) setSession(data.session)
      setChanges(data.changes)
      // With the confetti, if it's switched on in Settings
      playFinishSound()
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      // A 409 means it's already finished, so there's nothing left to do here
      if (isAxiosError(err) && err.response?.status === 409) {
        clearSetDrafts(session._id)
        navigate(`/workouts/${session.workoutId}`, { replace: true })
        return
      }
      setError('Could not finish the workout. Please try again.')
      setConfirmingFinish(false)
      setFinishing(false)
    }
  }

  const allSets = session?.exercises.flatMap((exercise) => exercise.loggedSets) ?? []
  const loggedCount = allSets.filter((set) => set.done).length

  if (session && changes) return <FinishSummary session={session} changes={changes} />

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-lg mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-6">

        {status === 'loading' && (
          <Loading>Loading your workout…</Loading>
        )}

        {status === 'notFound' && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-zinc-400">Workout not found.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
              <ArrowLeftIcon size={14} />
              Home
            </Link>
          </div>
        )}

        {status === 'error' && (
          <LoadError what="this workout" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && session && (
          <>
            {/* Laid out like the workout's page: back link, title, then the note with its icon.
                Leaving keeps the workout in progress, so it can be resumed later. */}
            <Reveal onLoad className="min-w-0 flex flex-col gap-2">
              <BackLink to={`/workouts/${session.workoutId}`}>Workout</BackLink>
              <div className="flex items-start gap-2">
                <h1 className={`${pageTitle} min-w-0 wrap-break-word`}>{session.workoutName}</h1>
                <PageHelp {...helpText.session} />
              </div>
              {session.workoutNote && (
                <p className="flex items-start gap-2 text-sm text-zinc-400">
                  <NoteIcon size={16} className="shrink-0 mt-0.5 text-zinc-400" />
                  <span className="sr-only">Note: </span>
                  <span className="min-w-0 whitespace-pre-line wrap-break-word">{session.workoutNote}</span>
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
                <span className={softPill}>In progress</span>
                {loggedCount} of {allSets.length} sets logged
              </p>
            </Reveal>

            {error && (
              <p role="alert" className="text-xs text-red-500">{error}</p>
            )}

            <ul className="flex flex-col gap-3">
              {session.exercises.map((exercise, exerciseIndex) => (
                <Reveal as="li" key={exerciseIndex} delay={60 + listRevealDelay(exerciseIndex)} className={`${card} flex flex-col gap-3`}>
                  <ExerciseHeader exercise={exercise} />
                  <ol className="flex flex-col gap-2">
                    {exercise.loggedSets.map((set, setIndex) => (
                      <SetRow
                        key={setIndex}
                        sessionId={session._id}
                        exerciseIndex={exerciseIndex}
                        setIndex={setIndex}
                        set={set}
                        last={exercise.lastSets?.[setIndex]}
                        target={exercise.targetReps === undefined ? undefined : {
                          reps: exercise.targetReps,
                          weight: exercise.noWeight ? undefined : exercise.targetWeight,
                        }}
                        noWeight={exercise.noWeight}
                        exerciseName={exercise.name}
                        onToggle={(reps, weight, done) => toggleSet(exerciseIndex, setIndex, reps, weight, done)}
                      />
                    ))}
                  </ol>
                </Reveal>
              ))}
            </ul>

            <Reveal className="flex justify-end gap-2">
              <button onClick={() => setDiscarding(true)} disabled={finishing} className={dangerSecondaryButton}>Discard</button>
              <button
                onClick={() => (loggedCount < allSets.length ? setConfirmingFinish(true) : finish())}
                disabled={finishing}
                className={accentSecondaryButton}
              >
                {finishing ? 'Finishing…' : 'Finish workout'}
              </button>
            </Reveal>

            {rest && <RestTimer key={rest.id} seconds={rest.seconds} onClose={() => setRest(null)} />}
          </>
        )}

      </main>

      {confirmingFinish && session && (
        <Modal title="Finish workout?" busy={finishing} onClose={() => setConfirmingFinish(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">
              {allSets.length - loggedCount} of {allSets.length} sets aren't logged. Only logged sets count toward your next targets.
            </p>
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setConfirmingFinish(false)} disabled={finishing} className={secondaryButton}>Keep going</button>
              <button onClick={finish} disabled={finishing} className={accentButton}>
                {finishing ? 'Finishing…' : 'Finish workout'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {discarding && session && (
        <ConfirmDeleteDialog
          title="Discard workout?"
          // Always asks: one slip would lose the sets logged so far
          rememberable={false}
          message="The sets you logged will be deleted, and your targets stay as they were."
          path={`/sessions/${session._id}`}
          onClose={() => setDiscarding(false)}
          onDeleted={() => {
            clearSetDrafts(session._id)
            navigate(`/workouts/${session.workoutId}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}
