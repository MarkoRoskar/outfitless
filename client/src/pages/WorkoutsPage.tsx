import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api, { conflictMessage, isUnauthorized } from '../lib/axios'
import { MAX_NOTE_LENGTH, MAX_REST_SECONDS } from '../lib/limits'
import { fieldClass, inlineLink, labelClass, primaryButton, secondaryButton, mainPageTitle } from '../lib/styles'
import SearchField from '../components/SearchField'
import ActionMenu from '../components/ActionMenu'
import MuscleGroupPhotos from '../components/MuscleGroupPhotos'
import NewButton from '../components/NewButton'
import Hint from '../components/Hint'
import { NoteIcon } from '../components/icons'
import { useAuthStore } from '../store/authStore'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import DragHandle from '../components/DragHandle'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import LoadError from '../components/LoadError'
import PageHelp from '../components/PageHelp'
import { helpText } from '../lib/helpText'
import Loading from '../components/Loading'
import Reveal from '../components/Reveal'
import { listRevealDelay, useReveal } from '../lib/useReveal'

// Workout as returned by the API
interface Workout {
  _id: string
  name: string
  note?: string
  restBetweenExercises: number
  // Only in the list, not when one workout is created or saved
  exerciseNames?: string[]
  // Every muscle group its exercises work, each once, for the card's photos. Also only in the list.
  muscleGroups?: string[]
}

// Pop-up form for creating (workout is null) or editing a workout
function WorkoutDialog({ workout, onClose, onSaved }: {
  workout: Workout | null
  onClose: () => void
  onSaved: (workout: Workout) => void
}) {
  const { logout } = useAuthStore()
  const [name, setName] = useState(workout?.name ?? '')
  const [note, setNote] = useState(workout?.note ?? '')
  // Kept as a string while typing, and converted to a number when saving
  const [rest, setRest] = useState(String(workout?.restBetweenExercises ?? 60))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const payload = { name: name.trim(), note: note.trim(), restBetweenExercises: Number(rest) }
      const { data } = workout
        ? await api.patch<Workout>(`/workouts/${workout._id}`, payload)
        : await api.post<Workout>('/workouts', payload)
      onSaved(data)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError(conflictMessage(err) ?? 'Could not save the workout. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal title={workout ? 'Edit workout' : 'New workout'} busy={saving} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workout-name" className={labelClass}>Name</label>
          <input
            id="workout-name"
            type="text"
            placeholder="Push Day"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            required
            aria-describedby="workout-name-hint"
            className={`h-10 ${fieldClass}`}
          />
          <p id="workout-name-hint" className="text-xs text-zinc-400">
            Name it after what you train, like Push Day or Legs.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="workout-rest" className={labelClass}>Rest between exercises</label>
          {/* The unit sits inside the box, at its right end, so the label can stay short */}
          <div className="relative">
            <input
              id="workout-rest"
              type="number"
              min={0}
              max={MAX_REST_SECONDS}
              step={1}
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              required
              aria-describedby="workout-rest-unit"
              className={`h-10 w-full pr-20 ${fieldClass}`}
            />
            <span id="workout-rest-unit" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">
              seconds
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="workout-note" className={labelClass}>Note (optional)</label>
          <textarea
            id="workout-note"
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Warm-up, supersets, anything to remember…"
            className={`py-2 resize-y ${fieldClass}`}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : workout ? 'Save changes' : 'Create workout'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// One workout row. Only the grip starts a drag, so clicking anywhere else still opens the workout.
function SortableWorkout({ workout, index, disabled, handleOff, onEdit, onDelete }: {
  workout: Workout
  index: number
  disabled: boolean
  // While searching only part of the list is shown, so reordering is off. The grip stays, dimmed,
  // so the cards don't shift sideways as the search starts and ends.
  handleOff: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: workout._id, disabled })
  const reveal = useReveal({ delay: listRevealDelay(index) })

  return (
    <li
      ref={(node) => { reveal.ref(node); setNodeRef(node) }}
      data-variant={reveal['data-variant']}
      onAnimationEnd={reveal.onAnimationEnd}
      style={{ ...reveal.style, transform: CSS.Translate.toString(transform), transition }}
      // isolate makes the card its own layer, so the photos can sit at its back, behind the text.
      // While its ⋯ menu is open the card itself is raised, or the menu would open under the cards below.
      className={`${reveal.className} group relative isolate has-[[role=menu]]:z-30 flex items-start gap-3 card-fade p-4 rounded-2xl bg-zinc-900/55 ring-1 ring-inset ring-white/4 hover:bg-zinc-800/45 transition-colors duration-200 ${isDragging ? 'z-20 shadow-lg bg-zinc-900!' : ''}`}
    >
      {/* The photos of every muscle group the workout's exercises work, as on the exercise cards.
          They stop short of the ⋯ button (32 px inside the 16 px padding). Kept at the card's
          back rather than lifting the text above them, since a positioned text block would
          shrink the stretched link to itself. */}
      <div className="absolute inset-0 -z-10">
        <MuscleGroupPhotos groups={workout.muscleGroups ?? []} right={56} />
      </div>
      {/* Sits above the stretched link, like the buttons */}
      <DragHandle
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        off={handleOff}
        aria-label={handleOff ? `Clear the search to reorder ${workout.name}` : `Reorder ${workout.name}`}
        title={handleOff ? 'Clear the search to reorder' : undefined}
        className="relative z-10"
      />
      {/* Like the exercise cards: every card is two lines high, the name and the exercises each cut
          short with "…" when too long. The whole name and list are on the workout's page. */}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <h2 className="min-w-0 h-5 flex items-center gap-1.5 text-sm font-semibold leading-5">
          {/* The link's ::after stretches over the whole row, so the row is clickable. The row is the
              ::after's containing block, so cutting the name short doesn't clip it. */}
          <Link
            to={`/workouts/${workout._id}`}
            title={workout.name}
            className="min-w-0 truncate group-hover:text-accent transition-colors duration-200 after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {workout.name}
          </Link>
          {/* The note itself is on the workout's page. The icon just shows there is one, as on Exercises. */}
          {workout.note && (
            <span aria-label="Has a note" className="shrink-0 text-zinc-400"><NoteIcon size={14} /></span>
          )}
        </h2>
        {/* What the workout contains says more at a glance than its settings: the names in order,
            separated by commas and cut short with "…" when they don't fit on one line */}
        <p className="text-xs leading-5 text-zinc-400 truncate">
          {workout.exerciseNames && workout.exerciseNames.length > 0
            ? workout.exerciseNames.join(', ')
            : 'No exercises yet'}
        </p>
      </div>
      {/* Sits above the stretched link, so it still gets its own clicks */}
      <ActionMenu
        itemName={workout.name}
        actions={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Delete', onSelect: onDelete, danger: true },
        ]}
      />
    </li>
  )
}

// Workouts shown at a time. All of them are loaded, so search covers every workout, and dragging
// works among the ones shown. "Show more" reveals the next ones.
const PAGE_SIZE = 10

// Lists the logged-in user's workouts. Each one links to its detail page, where exercises are managed.
export default function WorkoutsPage() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  // null: dialog closed, 'new': creating, Workout: editing that workout
  const [editing, setEditing] = useState<Workout | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Workout | null>(null)
  const [reordering, setReordering] = useState(false)
  const [reorderError, setReorderError] = useState('')
  const [search, setSearch] = useState('')
  // How many matching workouts are on screen. A new search starts again from the first page.
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  // How many exercises the user has, so the page can say to create them first. null if unknown.
  const [exerciseCount, setExerciseCount] = useState<number | null>(null)
  // Rows can be dragged with a mouse or finger, or moved with the keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!token) return
    let ignore = false

    // The exercise count only drives a hint, so if it fails the page still works without it
    const exercisesRequest = api.get<unknown[]>('/exercises')
      .then(({ data }) => data.length)
      .catch(() => null)

    Promise.all([api.get<Workout[]>('/workouts'), exercisesRequest])
      .then(([{ data }, count]) => {
        if (ignore) return
        setWorkouts(data)
        setExerciseCount(count)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [token, attempt, logout])

  if (!token) return <Navigate to="/login" replace />

  const searchText = search.trim().toLowerCase()
  const visibleWorkouts = workouts.filter((workout) => workout.name.toLowerCase().includes(searchText))

  function handleSaved(saved: Workout) {
    // A new workout has no exercises yet, and adding them is always next, so go straight to its page
    if (editing === 'new') {
      navigate(`/workouts/${saved._id}`)
      return
    }
    setWorkouts((current) =>
      current.some((w) => w._id === saved._id)
        // A saved workout comes back without its exercise names, so keep the ones already shown
        ? current.map((w) => (w._id === saved._id ? { ...saved, exerciseNames: w.exerciseNames, muscleGroups: w.muscleGroups } : w))
        : [saved, ...current]
    )
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setWorkouts((current) => current.filter((w) => w._id !== id))
    setDeleting(null)
  }

  // Runs when a row is dropped. over is null if it was dropped outside the list.
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = workouts.findIndex((workout) => workout._id === active.id)
    const to = workouts.findIndex((workout) => workout._id === over.id)
    moveWorkout(from, to)
  }

  // The list updates right away, and goes back if the server can't save the new order.
  async function moveWorkout(from: number, to: number) {
    const previous = workouts
    const next = arrayMove(workouts, from, to)

    setWorkouts(next)
    setReorderError('')
    setReordering(true)
    try {
      await api.put('/workouts/order', { ids: next.map((workout) => workout._id) })
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setWorkouts(previous)
      setReorderError('Could not save the new order. Please try again.')
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16">

        <div className="flex flex-col gap-3 mb-6">
          <Reveal onLoad className="flex items-center gap-2">
            <h1 className={mainPageTitle}>Workouts</h1>
            <PageHelp {...helpText.workouts} />
          </Reveal>
          {/* Workouts are built from exercises, so without any there's nothing to add to them */}
          {status === 'ready' && exerciseCount === 0 && (
            <Hint>
              Workouts are built from your exercises, and you don't have any yet.{' '}
              <Link to="/exercises" className={inlineLink}>Create some exercises</Link>{' '}
              first.
            </Hint>
          )}
          {/* Only until the first workout gets exercises. After that they know how it works,
              even if another workout is still empty. */}
          {status === 'ready' && exerciseCount !== 0 && workouts.length > 0 && workouts.every((w) => !w.exerciseNames?.length) && (
            <Hint>
              {/* "Tap" on touch screens, "Click" with a mouse. Only one is shown, and the hidden one isn't read out. */}
              <span className="pointer-coarse:hidden">Click</span>
              <span className="hidden pointer-coarse:inline">Tap</span>
              {' '}a workout to add exercises to it.
            </Hint>
          )}
        </div>

        {status === 'loading' && (
          <Loading>Loading your workouts…</Loading>
        )}

        {status === 'error' && (
          <LoadError what="your workouts" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {/* Like the dashboard, only the first missing step is shown: exercises before workouts */}
        {status === 'ready' && workouts.length === 0 && exerciseCount !== 0 && (
          <Hint>
            No workouts yet. A workout is a list of exercises in order, like a push or leg day.{' '}
            <button onClick={() => setEditing('new')} className={inlineLink}>Create your first workout</button>.
          </Hint>
        )}

        {reorderError && (
          <p role="alert" className="text-xs text-red-500 mb-4">{reorderError}</p>
        )}

        {/* Searching and creating share the row right above the list */}
        {status === 'ready' && workouts.length > 0 && (
          <Reveal onLoad delay={60} className="flex items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <SearchField
                label="Search workouts by name"
                placeholder="Search workouts"
                value={search}
                onChange={(value) => { setSearch(value); setShownCount(PAGE_SIZE) }}
                fill
              />
            </div>
            <NewButton onClick={() => setEditing('new')} />
          </Reveal>
        )}

        {status === 'ready' && workouts.length > 0 && visibleWorkouts.length === 0 && (
          <p className="text-sm text-zinc-400">
            No workouts match your search.{' '}
            <button onClick={() => { setSearch(''); setShownCount(PAGE_SIZE) }} className={inlineLink}>Clear search</button>
          </p>
        )}

        {status === 'ready' && visibleWorkouts.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleWorkouts.slice(0, shownCount).map((workout) => workout._id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {visibleWorkouts.slice(0, shownCount).map((workout, index) => (
                  <SortableWorkout
                    key={workout._id}
                    workout={workout}
                    index={index}
                    // Dragging needs the full list, so it's off while searching
                    disabled={reordering || searchText !== ''}
                    handleOff={searchText !== ''}
                    onEdit={() => setEditing(workout)}
                    onDelete={() => setDeleting(workout)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {status === 'ready' && visibleWorkouts.length > shownCount && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <button onClick={() => setShownCount((count) => count + PAGE_SIZE)} className={secondaryButton}>
              Show more
            </button>
            <p className="text-xs text-zinc-400 tabular-nums">
              Showing {shownCount} of {visibleWorkouts.length}
            </p>
          </div>
        )}

      </main>

      {editing && (
        <WorkoutDialog
          workout={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Delete workout?"
          message={`"${deleting.name}" and its history will be permanently deleted, including a workout in progress. Your exercises are kept.`}
          path={`/workouts/${deleting._id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => handleDeleted(deleting._id)}
        />
      )}
    </div>
  )
}
