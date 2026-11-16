import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api, { conflictMessage, isUnauthorized } from '../lib/axios'
import { MAX_REPS, MAX_REST_SECONDS, MAX_SETS, MAX_WEIGHT, MAX_WEIGHT_INCREMENT } from '../lib/limits'
import { muscleGroupLabels } from '../lib/muscleGroups'
import { fieldClass, inlineLink, labelClass, primaryButton, secondaryButton, pageTitle, pageSectionHeading, sectionHeading } from '../lib/styles'
import ActionMenu from '../components/ActionMenu'
import Hint from '../components/Hint'
import BackLink from '../components/BackLink'
import { ArrowRightIcon, ChevronDownIcon, NoteIcon, PlayIcon, TimerIcon, TrendDownIcon, TrendUpIcon } from '../components/icons'
import { useAuthStore } from '../store/authStore'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import DragHandle from '../components/DragHandle'
import Modal from '../components/Modal'
import Select from '../components/Select'
import NewButton from '../components/NewButton'
import Checkbox from '../components/Checkbox'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import LoadError from '../components/LoadError'
import PageHelp from '../components/PageHelp'
import { helpText } from '../lib/helpText'

// Loaded separately, so the chart library only downloads once Progress is opened
const WorkoutProgressChart = lazy(() => import('../components/WorkoutProgressChart'))

// The Progress heading opens and closes the charts. It starts closed, unless the link that led
// here ends in #progress (like "See progress" on a History card): then it starts open and scrolls
// into view. Nothing is loaded until it's first opened, and closing only hides the charts.
function ProgressSection({ workoutId }: { workoutId: string }) {
  const { hash } = useLocation()
  const [open, setOpen] = useState(hash === '#progress')
  const [opened, setOpened] = useState(open)
  const contentId = useId()
  const sectionRef = useRef<HTMLDivElement>(null)

  // The charts load after the page, so at first the page may be too short to scroll Progress to
  // the top. It scrolls again each time the section grows, until the person scrolls themselves
  // or a few seconds pass.
  useEffect(() => {
    const section = sectionRef.current
    if (hash !== '#progress' || !section) return
    const scroll = () => section.scrollIntoView({ block: 'start' })
    scroll()
    const observer = new ResizeObserver(scroll)
    observer.observe(section)
    const stop = () => observer.disconnect()
    const timer = setTimeout(stop, 4000)
    window.addEventListener('wheel', stop, { once: true })
    window.addEventListener('touchstart', stop, { once: true })
    return () => {
      stop()
      clearTimeout(timer)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
    }
  }, [hash])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) setOpened(true)
  }

  return (
    <div id="progress" ref={sectionRef} className="flex flex-col gap-3 scroll-mt-20">
      <h2 className={`${pageSectionHeading} self-start`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="-mx-2 px-2 h-8 flex items-center gap-1.5 rounded-lg uppercase tracking-[inherit] hover:bg-white/5 transition-colors duration-200"
        >
          Progress
          <ChevronDownIcon size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={contentId} hidden={!open}>
        {opened && (
          <Suspense fallback={<p className="text-sm text-zinc-400">Loading progress…</p>}>
            <WorkoutProgressChart key={workoutId} workoutId={workoutId} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

interface Workout {
  _id: string
  name: string
  note?: string
  restBetweenExercises: number
}

interface Exercise {
  _id: string
  name: string
  muscleGroups: string[]
}

// An exercise's settings inside this workout. It stores only the exercise's ID, so
// the name comes from the user's exercise list.
interface WorkoutExercise {
  _id: string
  exerciseId: string
  sets: number
  minReps?: number
  maxReps?: number
  amrap: boolean
  noWeight: boolean
  currentWeight?: number
  currentReps: number
  weightIncrement?: number
  restTime: number
}

// The workout in progress, which may be a different one from this page's
interface ActiveSession {
  _id: string
  workoutId: string
  workoutName: string
}

// A number box with its label above and, optionally, its unit inside at the right end, like the
// rest field in the New workout dialog. The unit in the box keeps the label short.
function NumberField({ label, value, onChange, min, max, step = 1, unit }: {
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max?: number
  step?: number | 'any'
  unit?: string
}) {
  const id = useId()
  return (
    <div className="min-w-0 flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          aria-describedby={unit ? `${id}-unit` : undefined}
          className={`h-10 w-full ${unit ? 'pr-16' : ''} ${fieldClass}`}
        />
        {unit && (
          <span id={`${id}-unit`} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// Pop-up form for adding an exercise to the workout (entry is null) or editing its settings. When
// adding, ticking "Add another after this" keeps it open for the next exercise, like New exercise.
function WorkoutExerciseDialog({ workoutId, entry, exercises, onClose, onSaved }: {
  workoutId: string
  entry: WorkoutExercise | null
  exercises: Exercise[]
  onClose: () => void
  // keepOpen is true when "Add another after this" is ticked, so the page adds it without closing
  onSaved: (entry: WorkoutExercise, keepOpen: boolean) => void
}) {
  const { logout } = useAuthStore()
  const [exerciseId, setExerciseId] = useState(entry?.exerciseId ?? exercises[0]?._id ?? '')
  // Numbers are kept as strings while typing. New entries start with sensible defaults.
  const [sets, setSets] = useState(String(entry?.sets ?? 3))
  const [minReps, setMinReps] = useState(String(entry?.minReps ?? 8))
  const [maxReps, setMaxReps] = useState(String(entry?.maxReps ?? 12))
  const [amrap, setAmrap] = useState(entry?.amrap ?? false)
  const [noWeight, setNoWeight] = useState(entry?.noWeight ?? false)
  // A new exercise starts at an empty 20 kg barbell, stepping up 2.5 kg, the usual smallest plates.
  // 0 kg was never a real starting weight.
  const [currentWeight, setCurrentWeight] = useState(String(entry?.currentWeight ?? 20))
  const [currentReps, setCurrentReps] = useState(String(entry?.currentReps ?? 8))
  const [weightIncrement, setWeightIncrement] = useState(String(entry?.weightIncrement ?? 1))
  const [restTime, setRestTime] = useState(String(entry?.restTime ?? 120))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [keepOpen, setKeepOpen] = useState(false)
  // The last exercise added while staying open, confirmed above the buttons
  const [added, setAdded] = useState('')

  // Each exercise with its muscle groups under it. The search matches either, so typing "chest"
  // finds every chest exercise.
  const exerciseOptions = exercises.map((exercise) => ({
    value: exercise._id,
    label: exercise.name,
    hint: exercise.muscleGroups.map((group) => muscleGroupLabels[group] ?? group).join(' · '),
  }))

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!entry && !exerciseId) {
      setError('Choose an exercise.')
      return
    }
    if (!amrap && Number(maxReps) < Number(minReps)) {
      setError('Max reps must be at least min reps.')
      return
    }
    if (!amrap && (Number(currentReps) < Number(minReps) || Number(currentReps) > Number(maxReps))) {
      setError('Target reps must be between min and max reps.')
      return
    }

    setError('')
    setAdded('')
    setSaving(true)
    try {
      const payload = {
        sets: Number(sets),
        amrap,
        noWeight,
        currentReps: Number(currentReps),
        // Hidden fields don't apply, so they aren't sent
        ...(amrap ? {} : { minReps: Number(minReps), maxReps: Number(maxReps) }),
        ...(noWeight ? {} : { currentWeight: Number(currentWeight), weightIncrement: Number(weightIncrement) }),
        restTime: Number(restTime),
      }
      // The exercise can only be chosen when adding, because the API doesn't allow changing it
      const { data } = entry
        ? await api.patch<WorkoutExercise>(`/workout-exercises/${entry._id}`, payload)
        : await api.post<WorkoutExercise>('/workout-exercises', { ...payload, workoutId, exerciseId })
      onSaved(data, keepOpen && !entry)
      if (keepOpen && !entry) {
        // Ready for the next one: the exercise clears, and the settings stay, since exercises
        // added in a row usually share them
        setAdded(exercises.find((exercise) => exercise._id === exerciseId)?.name ?? 'The exercise')
        setExerciseId('')
        setSaving(false)
      }
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError(conflictMessage(err) ?? 'Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={entry ? `Edit ${exercises.find((ex) => ex._id === entry.exerciseId)?.name ?? 'exercise'}` : 'Add exercise'}
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!entry && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workout-exercise-id" className={labelClass}>Exercise</label>
            <Select
              id="workout-exercise-id"
              value={exerciseId}
              options={exerciseOptions}
              onChange={setExerciseId}
              searchable
              searchPlaceholder="Search by name or muscle group"
              placeholder="Choose an exercise…"
              className={`w-full ${fieldClass}`}
            />
          </div>
        )}

        {/* One flow of labeled fields, like the New exercise, workout and routine dialogs. Each
            tick box sits right above the fields it hides. */}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Sets" value={sets} onChange={setSets} min={1} max={MAX_SETS} />
          {/* One set has nothing to rest between. The empty div keeps the grid cell. */}
          {Number(sets) !== 1 ? (
            <NumberField label="Rest" unit="seconds" value={restTime} onChange={setRestTime} min={0} max={MAX_REST_SECONDS} />
          ) : (
            <div />
          )}
        </div>

        <Checkbox checked={amrap} onChange={setAmrap}>As many reps as possible</Checkbox>
        <div className="grid grid-cols-3 gap-3">
          {!amrap && (
            <>
              <NumberField label="Min reps" value={minReps} onChange={setMinReps} min={1} max={MAX_REPS} />
              <NumberField label="Max reps" value={maxReps} onChange={setMaxReps} min={1} max={MAX_REPS} />
            </>
          )}
          <NumberField label="Target reps" value={currentReps} onChange={setCurrentReps} min={0} max={MAX_REPS} />
        </div>

        <Checkbox checked={noWeight} onChange={setNoWeight}>No weight, like pull-ups or planks</Checkbox>
        {/* Bottom-aligned, so the boxes stay level if a label wraps on a narrow phone */}
        {!noWeight && (
          <div className="grid grid-cols-2 gap-3 items-end">
            <NumberField label="Target weight" unit="kg" value={currentWeight} onChange={setCurrentWeight} min={0} max={MAX_WEIGHT} step="any" />
            <NumberField label="Increment/decrement" unit="kg" value={weightIncrement} onChange={setWeightIncrement} min={0} max={MAX_WEIGHT_INCREMENT} step="any" />
          </div>
        )}

        {!entry && (
          <Checkbox checked={keepOpen} onChange={setKeepOpen}>Add another after this</Checkbox>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-500">{error}</p>
        )}

        {added && !error && (
          <p role="status" className="text-xs text-accent-dim wrap-break-word">Added {added}. Next one?</p>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>
            {added ? 'Done' : 'Cancel'}
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : entry ? 'Save changes' : 'Add exercise'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// One exercise card. Closed, it shows just what matters at a glance: the number and name, the
// muscle groups and the current target, each cut short with "…" if too long. Tapping it anywhere,
// like the cards on Exercises, opens the plan underneath. The grip and the buttons keep their own taps.
function SortableEntry({ entry, position, name, muscleGroups, disabled, onEdit, onRemove }: {
  entry: WorkoutExercise
  position: number
  name: string
  muscleGroups: string[]
  disabled: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entry._id, disabled })
  const [open, setOpen] = useState(false)
  // Where the pointer went down, to tell a tap from a drag across the text
  const pressedAt = useRef<{ x: number; y: number } | null>(null)
  const toggle = () => setOpen((current) => !current)

  function handleCardClick(e: React.MouseEvent) {
    const start = pressedAt.current
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
    toggle()
  }

  const groups = muscleGroups.map((group) => muscleGroupLabels[group] ?? group).join(' · ')
  const current = entry.noWeight ? `${entry.currentReps} reps` : `${entry.currentWeight} kg × ${entry.currentReps}`
  // The rules under the plan, each a short sentence with an icon. They match the server's
  // (nextCurrentNumbers in session.service.ts):
  // - With weight and a range: the heaviest set with at least min reps becomes the target; over
  //   max reps at that weight adds the increment, and no set reaching min reps takes it off
  // - Without weight: the target reps follow the best set, kept inside the range
  // - Max-rep sets: the target becomes the best set, and the weight never changes by itself
  // One set has nothing to rest between.
  const weightRules = !entry.noWeight && !entry.amrap
  const details = [
    entry.noWeight && !entry.amrap && { key: 'reps', icon: TrendUpIcon, text: <>Your best set becomes your target, up to {entry.maxReps} reps</> },
    entry.amrap && { key: 'max', icon: TrendUpIcon, text: <>Your best set becomes your target</> },
    weightRules && { key: 'best', icon: TrendUpIcon, text: <>Your heaviest set of {entry.minReps}+ reps becomes your target</> },
    weightRules && { key: 'up', icon: TrendUpIcon, text: <><Num>+{entry.weightIncrement} kg</Num> when it goes over {entry.maxReps} reps</> },
    weightRules && { key: 'down', icon: TrendDownIcon, text: <><Num>−{entry.weightIncrement} kg</Num> when no set reaches {entry.minReps} reps</> },
    entry.sets !== 1 && { key: 'rest', icon: TimerIcon, text: <><Num>{entry.restTime} s</Num> rest between sets</> },
  ].filter((detail) => detail !== false)
  // Clicks on these stay with them, so dragging or using the menu doesn't also open or close the card
  const keepClick = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onPointerDown={(e) => { pressedAt.current = { x: e.clientX, y: e.clientY } }}
      // A double tap would select the word under it, so a second quick press doesn't select
      onMouseDown={(e) => { if (e.detail > 1) e.preventDefault() }}
      onClick={handleCardClick}
      className={`p-4 rounded-2xl cursor-pointer bg-zinc-900/55 ring-1 ring-inset ring-white/4 hover:bg-zinc-800/45 transition-colors duration-200 ${isDragging ? 'relative z-10 shadow-lg bg-zinc-900!' : ''}`}
    >
      <div className="flex items-center gap-3">
        <DragHandle ref={setActivatorNodeRef} {...attributes} {...listeners} onClick={keepClick} aria-label={`Reorder ${name}`} />

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <h2 className="min-w-0 flex items-baseline gap-2 text-sm font-semibold leading-6">
            <span className="shrink-0 text-xs font-mono font-bold text-accent-dim">{position}</span>
            <span className={`min-w-0 ${open ? 'wrap-break-word' : 'truncate'}`}>{name}</span>
          </h2>
          {/* What you'll do, which matters more here than the muscle groups (those are inside) */}
          {/* Spaced apart rather than separated by a dot, like the details on History cards */}
          <p className="flex gap-x-3 text-xs leading-5 text-zinc-400 tabular-nums whitespace-nowrap">
            <span><Num>{entry.sets}</Num> {entry.sets === 1 ? 'set' : 'sets'}</span>
            <span><Num>{entry.amrap ? 'max' : `${entry.minReps}–${entry.maxReps}`}</Num> reps</span>
          </p>
          {/* On phones the current target is a line here, so the name keeps its room */}
          <p className="sm:hidden flex items-baseline gap-2 leading-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Target</span>
            <span className="text-sm font-semibold tabular-nums text-accent-dim">{current}</span>
          </p>
        </div>

        {/* Wider screens have room for it as a tile. The lighter green, so it doesn't outshine the Start card. */}
        <div className="hidden sm:flex shrink-0 flex-col gap-0.5 px-3 py-2 rounded-xl bg-accent-dim/8">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Target</span>
          <span className="text-sm font-semibold tabular-nums text-accent-dim">{current}</span>
        </div>

        <div onClick={keepClick} className="shrink-0 self-start flex items-center cursor-default">
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? `Hide the plan for ${name}` : `Show the plan for ${name}`}
            aria-expanded={open}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200"
          >
            <ChevronDownIcon size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
          <ActionMenu
            itemName={name}
            actions={[
              { label: 'Edit', onSelect: onEdit },
              { label: 'Remove', onSelect: onRemove, danger: true },
            ]}
          />
        </div>
      </div>

      {/* Labeled sections under thin lines, like an open exercise card: the rules of the plan, then the
          muscle groups. The lines run the full width, and the text lines up with the name after the grip. */}
      {open && (
        <>
          <div className="mt-3 pt-1 pl-6 flex flex-col gap-1.5 border-t border-white/8">
            <p className={sectionHeading}>Plan</p>
            <ul className="flex flex-col gap-1.5">
              {details.map(({ key, icon: Icon, text }) => (
                <li key={key} className="flex items-start gap-2 text-sm text-zinc-400 tabular-nums">
                  <Icon size={16} className="shrink-0 mt-0.5 text-zinc-400" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          {groups && (
            <div className="mt-3 pt-1 pl-6 flex flex-col gap-1.5 border-t border-white/8">
              <p className={sectionHeading}>{muscleGroups.length === 1 ? 'Muscle group' : 'Muscle groups'}</p>
              <p className="text-sm leading-relaxed text-zinc-200 wrap-break-word">{groups}</p>
            </div>
          )}
        </>
      )}
    </li>
  )
}

// A number inside a gray sentence, in white like the big numbers of the plan, so it stands out
function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-zinc-50">{children}</span>
}

// The card under the title that starts or resumes the workout: a green play circle, what's about
// to start, and an arrow. The whole card is the button. Errors from starting show inside it.
function StartCard({ label, summary, to, onClick, busy = false, error }: {
  label: string
  summary: React.ReactNode
  to?: string
  onClick?: () => void
  busy?: boolean
  error?: string
}) {
  const inner = (
    <>
      <span className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-accent text-black group-hover:bg-accent-dim transition-colors duration-200">
        {/* Nudged right, since a triangle's visual center sits right of its box's center */}
        <PlayIcon size={18} className="ml-0.5" />
      </span>
      <span className="min-w-0 flex-1 flex flex-col text-left">
        <span className="text-base font-bold text-accent">{label}</span>
        <span className="text-[13px] text-zinc-400 tabular-nums">{summary}</span>
      </span>
      <ArrowRightIcon size={20} className="shrink-0 text-accent group-hover:translate-x-0.5 transition-transform duration-200" />
    </>
  )
  const className = 'group w-full flex items-center gap-3.5 p-3.5 pr-4 rounded-2xl border border-accent/35 bg-linear-to-b from-accent/14 to-accent/7 hover:border-accent/60 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200'
  return (
    <div className="flex flex-col gap-2">
      {to ? (
        <Link to={to} className={className}>{inner}</Link>
      ) : (
        <button type="button" onClick={onClick} disabled={busy} className={className}>{inner}</button>
      )}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Small link above the title back to the list, so a phone has a way back without the browser's button
// Shows one workout and lets the user add, edit and remove its exercises
export default function WorkoutDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, logout } = useAuthStore()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [entries, setEntries] = useState<WorkoutExercise[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  // null: dialog closed, 'new': adding, WorkoutExercise: editing that entry
  const [editing, setEditing] = useState<WorkoutExercise | 'new' | null>(null)
  const [removing, setRemoving] = useState<WorkoutExercise | null>(null)
  const [reordering, setReordering] = useState(false)
  const [reorderError, setReorderError] = useState('')
  // Rows can be dragged with a mouse or finger, or moved with the keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load the workout, its entries and the user's exercises together
  useEffect(() => {
    if (!token) return
    let ignore = false

    Promise.all([
      api.get<Workout>(`/workouts/${id}`),
      api.get<WorkoutExercise[]>(`/workout-exercises/workout/${id}`),
      api.get<Exercise[]>('/exercises'),
      // This only decides which button shows, so a failure shouldn't block the page
      api.get<ActiveSession | null>('/sessions/active').catch(() => ({ data: null })),
    ])
      .then(([workoutRes, entriesRes, exercisesRes, activeSessionRes]) => {
        if (ignore) return
        setWorkout(workoutRes.data)
        setEntries(entriesRes.data)
        setExercises(exercisesRes.data)
        setActiveSession(activeSessionRes.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        // The server answers 400 for a malformed ID and 404 for an unknown one
        else if (isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 404)) setStatus('notFound')
        else setStatus('error')
      })

    return () => { 
      ignore = true }
  }, [token, id, attempt, logout])

  if (!token) return <Navigate to="/login" replace />

  function exerciseName(entry: WorkoutExercise) {
    return exercises.find((exercise) => exercise._id === entry.exerciseId)?.name ?? 'Unknown exercise'
  }

  function handleSaved(saved: WorkoutExercise, keepOpen = false) {
    setEntries((current) =>
      current.some((e) => e._id === saved._id)
        ? current.map((e) => (e._id === saved._id ? saved : e))
        : [...current, saved]
    )
    if (!keepOpen) setEditing(null)
  }

  // Runs when a row is dropped. over is null if it was dropped outside the list.
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = entries.findIndex((entry) => entry._id === active.id)
    const to = entries.findIndex((entry) => entry._id === over.id)
    moveEntry(from, to)
  }

  // The list updates right away, and goes back if the server can't save the new order.
  async function moveEntry(from: number, to: number) {
    const previous = entries
    const next = arrayMove(entries, from, to)

    setEntries(next)
    setReorderError('')
    setReordering(true)
    try {
      await api.put(`/workout-exercises/workout/${id}/order`, { ids: next.map((entry) => entry._id) })
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setEntries(previous)
      setReorderError('Could not save the new order. Please try again.')
    } finally {
      setReordering(false)
    }
  }

  async function startWorkout() {
    setStartError('')
    setStarting(true)
    try {
      const { data } = await api.post<ActiveSession>('/sessions', { workoutId: id })
      navigate(`/sessions/${data._id}`)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      // A 409 means another workout started in the meantime, so show the server's explanation
      setStartError(
        isAxiosError(err) && err.response?.status === 409
          ? err.response.data.message
          : 'Could not start the workout. Please try again.'
      )
      setStarting(false)
    }
  }

  const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0)

  function handleRemoved(entryId: string) {
    setEntries((current) => current.filter((e) => e._id !== entryId))
    setRemoving(null)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-6">

        {status === 'loading' && (
          <p className="text-sm text-zinc-400">Loading workout…</p>
        )}

        {status === 'notFound' && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-zinc-400">This workout doesn't exist, or it was deleted.</p>
            <Link to="/workouts" className={inlineLink}>Back to your workouts</Link>
          </div>
        )}

        {status === 'error' && (
          <LoadError what="this workout" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && workout && (
          <>
            <div className="min-w-0 flex flex-col gap-2">
              <BackLink to="/workouts">Workouts</BackLink>
              {/* The ⓘ stays at the top right of a long name that wraps */}
              <div className="flex items-start gap-2">
                <h1 className={`${pageTitle} min-w-0 wrap-break-word`}>{workout.name}</h1>
                <PageHelp {...helpText.workout} />
              </div>
              {/* An icon in front of each says what it is: the note icon is the one the Workouts list
                  shows for a workout with a note, and a timer for the rest */}
              {workout.note && (
                <p className="flex items-start gap-2 text-sm text-zinc-400">
                  <NoteIcon size={16} className="shrink-0 mt-0.5 text-zinc-400" />
                  <span className="sr-only">Note: </span>
                  <span className="min-w-0 whitespace-pre-line wrap-break-word">{workout.note}</span>
                </p>
              )}
              <p className="flex items-start gap-2 text-sm text-zinc-400">
                <TimerIcon size={16} className="shrink-0 mt-0.5 text-zinc-400" />
                {workout.restBetweenExercises} s rest between exercises
              </p>
            </div>

            {/* Resume this workout, or start it when nothing else is in progress */}
            {entries.length > 0 && (!activeSession || activeSession.workoutId === workout._id) && (
              <StartCard
                summary={(
                  <span className="inline-flex gap-x-3">
                    <span>{entries.length} {entries.length === 1 ? 'exercise' : 'exercises'}</span>
                    <span>{totalSets} {totalSets === 1 ? 'set' : 'sets'}</span>
                  </span>
                )}
                {...(activeSession
                  ? { label: 'Resume workout', to: `/sessions/${activeSession._id}` }
                  : { label: starting ? 'Starting…' : 'Start workout', onClick: startWorkout, busy: starting, error: startError })}
              />
            )}

            {activeSession && activeSession.workoutId !== workout._id && (
              <Hint>
                <span className="wrap-break-word">{activeSession.workoutName}</span> is in progress.{' '}
                <Link to={`/sessions/${activeSession._id}`} className={inlineLink}>Resume it</Link>
                {' '}to finish or discard it before starting another workout.
              </Hint>
            )}

            {/* Nothing can be added until the user has exercises, so point them there */}
            {exercises.length === 0 && (
              <Hint>
                You don't have any exercises yet.{' '}
                <Link to="/exercises" className={inlineLink}>Create some exercises</Link>
                , then come back to add them to this workout.
              </Hint>
            )}

            {exercises.length > 0 && entries.length === 0 && (
              <Hint>
                This workout is empty.{' '}
                <button onClick={() => setEditing('new')} className={inlineLink}>Add the exercises</button>
                {' '}you'll do, in the order you want to do them.
              </Hint>
            )}

            {reorderError && (
              <p role="alert" className="text-xs text-red-500">{reorderError}</p>
            )}

            {/* Adding sits right above the list, where + New is on the other pages */}
            {entries.length > 0 && exercises.length > 0 && (
              <div className="-mb-2 flex items-center justify-between gap-3">
                <h2 className={pageSectionHeading}>Exercises</h2>
                {/* The same + New as on Exercises, Workouts and Routines. The heading beside it says what it adds. */}
                <NewButton onClick={() => setEditing('new')} />
              </div>
            )}

            {entries.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={entries.map((entry) => entry._id)} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-2">
                    {entries.map((entry, index) => (
                      <SortableEntry
                        key={entry._id}
                        entry={entry}
                        position={index + 1}
                        name={exerciseName(entry)}
                        muscleGroups={exercises.find((exercise) => exercise._id === entry.exerciseId)?.muscleGroups ?? []}
                        disabled={reordering}
                        onEdit={() => setEditing(entry)}
                        onRemove={() => setRemoving(entry)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {entries.length > 0 && <ProgressSection workoutId={workout._id} />}

          </>
        )}

      </main>

      {editing && workout && (
        <WorkoutExerciseDialog
          workoutId={workout._id}
          entry={editing === 'new' ? null : editing}
          exercises={exercises}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {removing && (
        <ConfirmDeleteDialog
          title="Remove exercise?"
          message={`"${exerciseName(removing)}" and its settings will be removed from this workout. The exercise itself is kept.`}
          path={`/workout-exercises/${removing._id}`}
          onClose={() => setRemoving(null)}
          onDeleted={() => handleRemoved(removing._id)}
        />
      )}
    </div>
  )
}
