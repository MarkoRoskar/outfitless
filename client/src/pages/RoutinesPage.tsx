import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import api, { conflictMessage, isUnauthorized } from '../lib/axios'
import { MAX_NOTE_LENGTH } from '../lib/limits'
import { deleteLink, editLink, fieldClass, inlineLink, labelClass, primaryButton, secondaryButton, softPill, statusPill, mainPageTitle } from '../lib/styles'
import ActionMenu from '../components/ActionMenu'
import NewButton from '../components/NewButton'
import Select from '../components/Select'
import SearchField from '../components/SearchField'
import Hint from '../components/Hint'
import CardSection from '../components/CardSection'
import DragHandle from '../components/DragHandle'
import { ChevronDownIcon, CloseIcon, NoteIcon } from '../components/icons'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '../store/authStore'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import LoadError from '../components/LoadError'
import PageHelp from '../components/PageHelp'
import { helpText } from '../lib/helpText'

// Routine as returned by the API. workouts holds workout IDs in the order they're done,
// and the same ID can appear more than once.
interface Routine {
  _id: string
  name: string
  workouts: string[]
  note?: string
  // The routine being followed, and the position of its next workout
  active: boolean
  nextIndex: number
}

interface Workout {
  _id: string
  name: string
  // The workout's exercises, shown under its name in the picker
  exerciseNames?: string[]
}

// Routines shown at a time. All of them are loaded, so search covers every one; "Show more"
// reveals the next ones. 10, like Exercises, Workouts and History.
const PAGE_SIZE = 10

// The server's limit on workouts per routine (routine.validation.ts)
const MAX_WORKOUTS = 30

function workoutName(workouts: Workout[], id: string) {
  return workouts.find((workout) => workout._id === id)?.name ?? 'Unknown workout'
}

// One workout in the routine dialog's list. Its grip drags it to a new place, and × removes it.
// The same workout can be in a routine more than once, so each row has its own key.
function ChosenWorkout({ itemKey, position, name, onRemove }: {
  itemKey: string
  position: number
  name: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 pr-1 rounded-xl bg-white/4 ${isDragging ? 'relative z-10 shadow-lg bg-zinc-900!' : ''}`}
    >
      {/* The whole left part is the grip, like the cards on Workouts, so a drag needn't hit the dots */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${name}, position ${position}`}
        className={`shrink-0 self-stretch flex items-center gap-2.5 pl-3 pr-1 py-2 rounded-l-xl touch-none cursor-grab active:cursor-grabbing ${editLink}`}
      >
        <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" /><circle cx="9" cy="13" r="1.5" />
        </svg>
        <span className="text-xs font-mono font-bold text-accent-dim">{position}</span>
      </button>
      <span className="min-w-0 flex-1 py-2 text-sm wrap-break-word">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}, position ${position}`}
        className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 ${deleteLink}`}
      >
        <CloseIcon />
      </button>
    </li>
  )
}

// Counts up to give every row in the routine dialog its own key. Not crypto.randomUUID, which only
// exists on HTTPS pages and localhost, so it would fail when testing from a phone on the home network.
let nextChosenKey = 0

// Pop-up form for creating (routine is null) or editing a routine
function RoutineDialog({ routine, workouts, onClose, onSaved }: {
  routine: Routine | null
  workouts: Workout[]
  onClose: () => void
  onSaved: (routine: Routine) => void
}) {
  const { logout } = useAuthStore()
  const [name, setName] = useState(routine?.name ?? '')
  // Each chosen workout with a key of its own, since one workout can appear twice
  const withKey = (id: string) => ({ key: String(nextChosenKey++), id })
  const [chosen, setChosen] = useState(() => (routine?.workouts ?? []).map(withKey))
  const [note, setNote] = useState(routine?.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Rows can be dragged with a mouse or finger, or moved with the keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Each workout with its exercises under it. The search matches either.
  const workoutOptions = workouts.map((workout) => ({
    value: workout._id,
    label: workout.name,
    hint: workout.exerciseNames?.length ? workout.exerciseNames.join(', ') : undefined,
  }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setChosen((current) => {
      const from = current.findIndex((item) => item.key === active.id)
      const to = current.findIndex((item) => item.key === over.id)
      return arrayMove(current, from, to)
    })
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (chosen.length === 0) {
      setError('Add at least one workout.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const payload = { name: name.trim(), workouts: chosen.map((item) => item.id), note: note.trim() }
      const { data } = routine
        ? await api.patch<Routine>(`/routines/${routine._id}`, payload)
        : await api.post<Routine>('/routines', payload)
      onSaved(data)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError(conflictMessage(err) ?? 'Could not save the routine. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal title={routine ? 'Edit routine' : 'New routine'} busy={saving} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="routine-name" className={labelClass}>Name</label>
          <input
            id="routine-name"
            type="text"
            placeholder="Push / Pull / Legs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            required
            aria-describedby="routine-name-hint"
            className={`h-10 ${fieldClass}`}
          />
          <p id="routine-name-hint" className="text-xs text-zinc-400">
            Name the plan, like Push / Pull / Legs or Upper / Lower.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="routine-workout" className={labelClass}>Workouts, in order</label>

          {chosen.length === 0 && (
            <p className="text-sm text-zinc-400">No workouts yet. Add them in the order you'll do them.</p>
          )}

          {chosen.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chosen.map((item) => item.key)} strategy={verticalListSortingStrategy}>
                <ol className="flex flex-col gap-1.5">
                  {chosen.map((item, index) => (
                    <ChosenWorkout
                      key={item.key}
                      itemKey={item.key}
                      position={index + 1}
                      name={workoutName(workouts, item.id)}
                      onRemove={() => setChosen((current) => current.filter((other) => other.key !== item.key))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          {/* Picking a workout adds it to the end right away, so there's no separate Add button */}
          {chosen.length < MAX_WORKOUTS ? (
            <Select
              id="routine-workout"
              value=""
              options={workoutOptions}
              onChange={(id) => setChosen((current) => [...current, withKey(id)])}
              searchable
              searchPlaceholder="Search workouts or exercises"
              placeholder="+ Add a workout…"
              className={`w-full ${fieldClass}`}
            />
          ) : (
            <p className="text-xs text-zinc-400">A routine can have up to {MAX_WORKOUTS} workouts.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="routine-note" className={labelClass}>Note (optional)</label>
          <textarea
            id="routine-note"
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Rest days, how often to repeat it…"
            className={`py-2 resize-y ${fieldClass}`}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : routine ? 'Save changes' : 'Create routine'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// One routine in the list, built like the cards on Exercises. Closed, it's two lines: the name
// (with Active, and a note icon when it has one) and its workouts in one line, cut short with "…".
// Tapping it anywhere opens labeled sections under thin lines: the numbered workouts, with Next,
// and the note. Follow and ⋯ keep their own taps.
function RoutineCard({ routine, workouts, anyFollowed, linkedTo = false, sortDisabled, handleOff, onToggleActive, onEdit, onDelete }: {
  routine: Routine
  workouts: Workout[]
  // Dragging is off while a new order is saving or while searching
  sortDisabled: boolean
  // While searching only part of the list is shown, so the grip is dimmed, as on Workouts
  handleOff: boolean
  // Whether some routine is being followed, which decides which Follow buttons are green
  anyFollowed: boolean
  // True when a link pointed here, like one from a workout's delete dialog. The card then
  // starts open and scrolls into view.
  linkedTo?: boolean
  onToggleActive: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(linkedTo)
  const cardRef = useRef<HTMLLIElement | null>(null)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: routine._id, disabled: sortDisabled })
  useEffect(() => {
    if (linkedTo) cardRef.current?.scrollIntoView({ block: 'center' })
  }, [linkedTo])
  // Where the pointer went down, to tell a tap from a drag across the text
  const pressedAt = useRef<{ x: number; y: number } | null>(null)
  const toggle = () => setOpen((current) => !current)

  function handleCardClick(e: React.MouseEvent) {
    const start = pressedAt.current
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
    toggle()
  }

  const nextIndex = routine.active ? routine.nextIndex % routine.workouts.length : -1
  const names = routine.workouts.map((id) => workoutName(workouts, id))

  // Light green, like the Next label, on the routine being followed. When none is followed, every
  // Follow is green, inviting to pick one. The rest are a quiet gray. Its click doesn't toggle the card.
  // Closed, it's a short "Follow" at the right of the summary. Open, it sits at the bottom left,
  // says "Follow this routine" and is always green. The gray one has no background, so it's pulled right to line up.
  const followButton = (expanded: boolean) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggleActive() }}
      aria-label={`${routine.active ? 'Unfollow' : 'Follow'} ${routine.name}`}
      className={`shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-colors duration-200 ${
        expanded || routine.active || !anyFollowed
          ? 'text-accent-dim bg-accent-dim/12 hover:bg-accent-dim/20'
          : `-mr-2 text-zinc-400 hover:bg-white/8 hover:text-zinc-50`
      }`}
    >
      {routine.active ? 'Unfollow' : 'Follow'}{expanded && ' this routine'}
    </button>
  )

  return (
    <li
      ref={(node) => { cardRef.current = node; setNodeRef(node) }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onPointerDown={(e) => { pressedAt.current = { x: e.clientX, y: e.clientY } }}
      // A double tap would select the word under it, so a second quick press doesn't select
      onMouseDown={(e) => { if (e.detail > 1) e.preventDefault() }}
      onClick={handleCardClick}
      className={`relative flex gap-3 p-4 rounded-2xl cursor-pointer bg-zinc-900/55 ring-1 ring-inset ring-white/4 hover:bg-zinc-800/45 transition-colors duration-200 ${isDragging ? 'z-20 shadow-lg bg-zinc-900!' : ''}`}
    >
      {/* The whole left strip drags, as on Workouts. Its click stays with it, so it doesn't open the card. */}
      <DragHandle
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        off={handleOff}
        aria-label={handleOff ? `Clear the search to reorder ${routine.name}` : `Reorder ${routine.name}`}
        title={handleOff ? 'Clear the search to reorder' : undefined}
      />
      <div className="min-w-0 flex-1">
      {/* Two rows: the name with ⌄ ⋯, then the summary with Follow at its right end, right under
          the buttons. Follow is one tap away without crowding the name. The buttons' clicks stay
          with them, so they don't also open or close the card. */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <h2 className={`min-w-0 text-sm font-semibold leading-5 ${open ? 'wrap-break-word' : 'truncate'}`}>{routine.name}</h2>
          {routine.active && <span className={`shrink-0 ${statusPill}`}>Active</span>}
          {routine.note && !open && (
            <span aria-label="Has a note" className="shrink-0 text-zinc-400"><NoteIcon size={14} /></span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 -my-1 flex items-center cursor-default">
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? `Show less of ${routine.name}` : `Show all of ${routine.name}`}
            aria-expanded={open}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200"
          >
            <ChevronDownIcon size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
          <ActionMenu
            itemName={routine.name}
            actions={[
              { label: 'Edit', onSelect: onEdit },
              { label: 'Delete', onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>

      {/* Closed, the summary line with Follow at its right end, right under ⌄ ⋯. Open, the numbered
          list shows the workouts, so the summary steps aside and Follow moves to the card's bottom.
          For the routine being followed, the summary shows what's next, since that matters most. */}
      {!open && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs leading-5 text-zinc-400 tabular-nums truncate">
            {routine.active ? (
              <>Next up: <span className="font-semibold text-zinc-50">{names[nextIndex]}</span> ({nextIndex + 1} of {names.length} {names.length === 1 ? 'workout' : 'workouts'})</>
            ) : (
              names.join(', ')
            )}
          </p>
          {followButton(false)}
        </div>
      )}

      {open && (
        <>
          <CardSection label="Workouts, in order">
            <ol className="flex flex-col gap-1">
              {routine.workouts.map((id, index) => (
                <li key={`${id}-${index}`} className="flex items-baseline gap-2">
                  <span className="text-xs font-mono font-bold text-accent-dim shrink-0">{index + 1}</span>
                  {/* Opens the workout. Its click stays here, so the card doesn't close as it goes. */}
                  <Link
                    to={`/workouts/${id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 wrap-break-word hover:text-accent-dim transition-colors duration-200"
                  >
                    {names[index]}
                  </Link>
                  {index === nextIndex && <span className={`shrink-0 ${softPill}`}>Next</span>}
                </li>
              ))}
            </ol>
          </CardSection>
          {routine.note && (
            <CardSection label="Note">
              <span className="whitespace-pre-line">{routine.note}</span>
            </CardSection>
          )}
          <div className="mt-3 flex">{followButton(true)}</div>
        </>
      )}
      </div>
    </li>
  )
}


// Lists the logged-in user's routines and opens the create, edit and delete dialogs
export default function RoutinesPage() {
  const { token, logout } = useAuthStore()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  // null: dialog closed, 'new': creating, Routine: editing that routine
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Routine | null>(null)
  const [activeError, setActiveError] = useState('')
  const [search, setSearch] = useState('')
  // How many matching routines are on screen. A new search starts again from the first page.
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  // A routine to open, from a link like /routines?open=<id>
  const [searchParams] = useSearchParams()
  const linkedId = searchParams.get('open')
  const [reordering, setReordering] = useState(false)
  const [reorderError, setReorderError] = useState('')
  // Cards can be dragged with a mouse or finger, or moved with the keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Routines only store workout IDs, so load the workouts too for their names
  useEffect(() => {
    if (!token) return
    let ignore = false

    Promise.all([
      api.get<Routine[]>('/routines'),
      api.get<Workout[]>('/workouts'),
    ])
      .then(([routinesRes, workoutsRes]) => {
        if (ignore) return
        setRoutines(routinesRes.data)
        setWorkouts(workoutsRes.data)
        // Show enough pages to include the linked routine, even when it's past the first ten
        const linkedIndex = routinesRes.data.findIndex((r) => r._id === linkedId)
        if (linkedIndex >= PAGE_SIZE) setShownCount(Math.ceil((linkedIndex + 1) / PAGE_SIZE) * PAGE_SIZE)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [token, attempt, logout, linkedId])

  if (!token) return <Navigate to="/login" replace />

  const searchText = search.trim().toLowerCase()
  const visibleRoutines = routines.filter((routine) => routine.name.toLowerCase().includes(searchText))

  // Runs when a card is dropped. over is null if it was dropped outside the list.
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = routines.findIndex((routine) => routine._id === active.id)
    const to = routines.findIndex((routine) => routine._id === over.id)
    moveRoutine(from, to)
  }

  // The list updates right away, and goes back if the server can't save the new order
  async function moveRoutine(from: number, to: number) {
    const previous = routines
    const next = arrayMove(routines, from, to)

    setRoutines(next)
    setReorderError('')
    setReordering(true)
    try {
      await api.put('/routines/order', { ids: next.map((routine) => routine._id) })
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setRoutines(previous)
      setReorderError('Could not save the new order. Please try again.')
    } finally {
      setReordering(false)
    }
  }

  function handleSaved(saved: Routine) {
    setRoutines((current) =>
      current.some((r) => r._id === saved._id)
        ? current.map((r) => (r._id === saved._id ? saved : r))
        : [saved, ...current]
    )
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setRoutines((current) => current.filter((r) => r._id !== id))
    setDeleting(null)
  }

  // Only one routine can be active, so turning one on turns the others off
  async function setActive(routine: Routine, active: boolean) {
    setActiveError('')
    try {
      const { data } = await api.put<Routine>(`/routines/${routine._id}/active`, { active })
      setRoutines((current) =>
        current.map((r) => (r._id === data._id ? data : { ...r, active: active ? false : r.active }))
      )
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setActiveError('Could not update the active routine. Please try again.')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16">

        <div className="flex items-center gap-2 mb-6">
          <h1 className={mainPageTitle}>Routines</h1>
          <PageHelp {...helpText.routines} />
        </div>

        {/* Searching and creating share the row right above the list, as on Workouts and Exercises */}
        {status === 'ready' && routines.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <SearchField
                label="Search routines by name"
                placeholder="Search routines"
                value={search}
                onChange={(value) => { setSearch(value); setShownCount(PAGE_SIZE) }}
                fill
              />
            </div>
            <NewButton onClick={() => setEditing('new')} />
          </div>
        )}

        {status === 'ready' && routines.length > 0 && visibleRoutines.length === 0 && (
          <p className="text-sm text-zinc-400">
            No routines match your search.{' '}
            <button onClick={() => { setSearch(''); setShownCount(PAGE_SIZE) }} className={inlineLink}>Clear search</button>
          </p>
        )}

        {status === 'loading' && (
          <p className="text-sm text-zinc-400">Loading…</p>
        )}

        {status === 'error' && (
          <LoadError what="your routines" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && routines.length === 0 && workouts.length === 0 && (
          <Hint>
            Routines are built from your workouts, and you don't have any yet.{' '}
            <Link to="/workouts" className={inlineLink}>Create some workouts</Link>{' '}
            first.
          </Hint>
        )}

        {status === 'ready' && routines.length === 0 && workouts.length > 0 && (
          <Hint>
            No routines yet. A routine puts your workouts in order and shows the next one on your dashboard.{' '}
            <button onClick={() => setEditing('new')} className={inlineLink}>Create your first routine</button>.
          </Hint>
        )}

        {activeError && (
          <p role="alert" className="text-xs text-red-500 mb-4">{activeError}</p>
        )}

        {reorderError && (
          <p role="alert" className="text-xs text-red-500 mb-4">{reorderError}</p>
        )}

        {status === 'ready' && visibleRoutines.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleRoutines.slice(0, shownCount).map((routine) => routine._id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {visibleRoutines.slice(0, shownCount).map((routine) => (
                  <RoutineCard
                    key={routine._id}
                    routine={routine}
                    workouts={workouts}
                    anyFollowed={routines.some((r) => r.active)}
                    linkedTo={routine._id === linkedId}
                    sortDisabled={reordering || searchText !== ''}
                    handleOff={searchText !== ''}
                    onToggleActive={() => setActive(routine, !routine.active)}
                    onEdit={() => setEditing(routine)}
                    onDelete={() => setDeleting(routine)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {status === 'ready' && visibleRoutines.length > shownCount && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <button onClick={() => setShownCount((count) => count + PAGE_SIZE)} className={secondaryButton}>
              Show more
            </button>
            <p className="text-xs text-zinc-400 tabular-nums">
              Showing {shownCount} of {visibleRoutines.length}
            </p>
          </div>
        )}

      </main>

      {editing && (
        <RoutineDialog
          routine={editing === 'new' ? null : editing}
          workouts={workouts}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Delete routine?"
          message={`"${deleting.name}" will be permanently deleted. Your workouts are kept.`}
          path={`/routines/${deleting._id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => handleDeleted(deleting._id)}
        />
      )}
    </div>
  )
}
