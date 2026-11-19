import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api, { conflictMessage, isUnauthorized } from '../lib/axios'
import { MAX_NOTE_LENGTH } from '../lib/limits'
import { muscleGroupLabels } from '../lib/muscleGroups'
import { fieldClass, inlineLink, labelClass, primaryButton, secondaryButton, mainPageTitle, toolbarField } from '../lib/styles'
import SearchField from '../components/SearchField'
import Select, { type SelectOption } from '../components/Select'
import Checkbox from '../components/Checkbox'
import ActionMenu from '../components/ActionMenu'
import NewButton from '../components/NewButton'
import { ChevronDownIcon, NoteIcon } from '../components/icons'
import Hint from '../components/Hint'
import CardSection from '../components/CardSection'
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
import Expand from '../components/Expand'
import MuscleGroupPhotos from '../components/MuscleGroupPhotos'
import { listRevealDelay, useReveal } from '../lib/useReveal'

// Exercise as returned by the API (_id is MongoDB's ID field)
interface Exercise {
  _id: string
  name: string
  muscleGroups: string[]
  note?: string
  createdAt: string
}

type SortOption = 'newest' | 'oldest' | 'group'

// Exercises shown at a time. All of them are loaded, so search and filters cover every exercise;
// paging just keeps a long list from being one endless scroll.
const PAGE_SIZE = 10

const sortOptions: SelectOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'group', label: 'Muscle group' },
]

const groupFilterOptions: SelectOption[] = Object.entries(muscleGroupLabels).map(([value, label]) => ({ value, label }))

// An exercise's position when sorting by group, taken from its earliest group in muscleGroupLabels
function groupRank(exercise: Exercise) {
  const groupOrder = Object.keys(muscleGroupLabels)
  return Math.min(groupOrder.length, ...exercise.muscleGroups.map((group) => groupOrder.indexOf(group)))
}

// Pop-up form for creating (exercise is null) or editing an exercise. When creating, ticking "Add
// another after this" saves and clears the form but keeps it open, for several exercises in a row.
function ExerciseDialog({ exercise, existing, onClose, onSaved }: {
  exercise: Exercise | null
  // The user's other exercises, to warn when a name is already taken
  existing: Exercise[]
  onClose: () => void
  // keepOpen is true when "Add another after this" is ticked, so the page adds it without closing the dialog
  onSaved: (exercise: Exercise, keepOpen: boolean) => void
}) {
  const { logout } = useAuthStore()
  // Fields start with the exercise's values when editing, or empty when creating
  const [name, setName] = useState(exercise?.name ?? '')
  const [groups, setGroups] = useState<string[]>(exercise?.muscleGroups ?? [])
  const [note, setNote] = useState(exercise?.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Whether to stay open for the next exercise after creating this one
  const [keepOpen, setKeepOpen] = useState(false)
  // The last exercise added while staying open, confirmed above the buttons
  const [added, setAdded] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  // Another exercise with the same name, ignoring case and spaces at the ends. Only a warning:
  // "Bench press" and "Bench press (paused)" can be different, and so can two with the same name.
  const typed = name.trim().toLowerCase()
  const duplicate = typed === ''
    ? undefined
    : existing.find((other) => other._id !== exercise?._id && other.name.trim().toLowerCase() === typed)

  // Deselect the group if it's selected, otherwise select it.
  // Always builds a new array, because React won't notice a change to the existing one.
  function toggleGroup(group: string) {
    setGroups((current) =>
      current.includes(group) ? current.filter((g) => g !== group) : [...current, group]
    )
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (groups.length === 0) {
      setError('Select at least one muscle group.')
      return
    }

    setError('')
    setAdded('')
    setSaving(true)
    try {
      const payload = { name: name.trim(), muscleGroups: groups, note: note.trim() }
      // PATCH updates an existing exercise, POST creates a new one
      const { data } = exercise
        ? await api.patch<Exercise>(`/exercises/${exercise._id}`, payload)
        : await api.post<Exercise>('/exercises', payload)
      onSaved(data, keepOpen)
      if (keepOpen) {
        // Ready for the next one. The muscle groups stay, since exercises added in a row often
        // share them, like several chest exercises.
        setAdded(data.name)
        setName('')
        setNote('')
        setSaving(false)
        nameRef.current?.focus()
      }
    } catch (err) {
      // Logging out clears the token, which makes ExercisesPage redirect to /login
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setError(conflictMessage(err) ?? 'Could not save the exercise. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal title={exercise ? 'Edit exercise' : 'New exercise'} busy={saving} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exercise-name" className={labelClass}>Name</label>
          <input
            ref={nameRef}
            id="exercise-name"
            type="text"
            placeholder="Bench Press"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            required
            aria-describedby={duplicate ? 'exercise-name-duplicate' : 'exercise-name-hint'}
            className={`h-10 ${fieldClass}`}
          />
          {/* The hint makes way for the duplicate warning, so there's only ever one line here */}
          {!duplicate && (
            <p id="exercise-name-hint" className="text-xs text-zinc-400">
              Use the name you'd look for, like Bench Press or Squat.
            </p>
          )}
          {duplicate && (
            <p id="exercise-name-duplicate" className="text-xs text-amber-400">
              You already have an exercise called {duplicate.name}.
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={`${labelClass} mb-1.5`}>
            Muscle groups <span className="text-xs font-normal text-zinc-400">· pick one or more</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(muscleGroupLabels).map(([value, label]) => {
              const selected = groups.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleGroup(value)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors duration-200 ${
                    selected
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-white/10 text-zinc-400 hover:text-zinc-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="exercise-note" className={labelClass}>Note (optional)</label>
          <textarea
            id="exercise-note"
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Seat height, grip width, cues…"
            className={`py-2 resize-y ${fieldClass}`}
          />
        </div>

        {/* Only when creating. One tick box instead of a third button keeps the buttons on one row. */}
        {!exercise && (
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
            {saving ? 'Saving…' : exercise ? 'Save changes' : 'Create exercise'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// One exercise in the list. Closed, every card is the same two lines high: the name and the
// muscle groups ("Chest · Triceps", as on Workouts), each cut short with "…" if needed.
// Every card opens, by tapping it or its arrow, into labeled sections split by thin lines:
// the full name, every muscle group, and the note when there is one.
function ExerciseCard({ exercise, index, onEdit, onDelete }: { exercise: Exercise; index: number; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const reveal = useReveal({ delay: listRevealDelay(index) })
  const groups = exercise.muscleGroups.map((group) => muscleGroupLabels[group] ?? group).join(' · ')
  const toggle = () => setOpen((current) => !current)
  // Where the pointer went down, to tell a tap from a drag
  const pressedAt = useRef<{ x: number; y: number } | null>(null)

  // How far down the muscle group photos reach: the whole closed card, and on an open card only
  // down to the line above its sections (muscle groups and note), so those are on plain card and
  // never make the photos jump while the card opens or closes. A closed card has no sections on
  // the page. Measured as the card opens and closes, like on the other cards.
  const cardRef = useRef<HTMLLIElement | null>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)
  const [photosHeight, setPhotosHeight] = useState<number>()
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    function measure() {
      const cardBox = card!.getBoundingClientRect()
      const line = sectionsRef.current?.firstElementChild?.getBoundingClientRect()
      setPhotosHeight(Math.min(cardBox.height, line ? line.top - cardBox.top : Infinity))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  // A tap anywhere on the card, top to bottom, opens or closes it. A drag doesn't, so selecting
  // part of a note to copy it doesn't snap the card shut. Judged by how far the pointer moved
  // rather than by whether text is selected, so quick taps in a row all count.
  function handleCardClick(e: React.MouseEvent) {
    const start = pressedAt.current
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
    toggle()
  }

  return (
    <li
      {...reveal}
      ref={(node) => { reveal.ref(node); cardRef.current = node }}
      onPointerDown={(e) => { pressedAt.current = { x: e.clientX, y: e.clientY } }}
      // A double tap would select the word under it, so a second quick press doesn't select
      onMouseDown={(e) => { if (e.detail > 1) e.preventDefault() }}
      onClick={handleCardClick}
      className={`${reveal.className} group relative card-fade p-4 rounded-2xl cursor-pointer bg-zinc-900/55 ring-1 ring-inset ring-white/4 hover:bg-zinc-800/45 transition-colors duration-200`}
    >
      <MuscleGroupPhotos groups={exercise.muscleGroups} height={photosHeight} />
      {/* relative, so the card's content is drawn above the photos */}
      <div className="relative flex items-start justify-between gap-2">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }}
          className="min-w-0 flex-1 flex flex-col gap-1 rounded-lg"
        >
          {/* Open, the full name wraps in the title's place, like an open routine card */}
          {open ? (
            <h2 className="text-sm font-semibold leading-5 wrap-break-word">{exercise.name}</h2>
          ) : (
            <>
              <div className="min-w-0 h-5 flex items-center gap-1.5">
                <h2 className="min-w-0 text-sm font-semibold leading-5 truncate">{exercise.name}</h2>
                {exercise.note && (
                  <span aria-label="Has a note" className="shrink-0 text-zinc-400"><NoteIcon size={14} /></span>
                )}
              </div>
              <p className="text-xs leading-5 text-zinc-400 truncate">{groups}</p>
            </>
          )}
        </div>

        {/* Clicks here stay here, so using the menu doesn't also open or close the card */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center cursor-default">
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? `Show less of ${exercise.name}` : `Show all of ${exercise.name}`}
            aria-expanded={open}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200"
          >
            <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><ChevronDownIcon size={18} /></span>
          </button>
          <ActionMenu
            itemName={exercise.name}
            actions={[
              { label: 'Edit', onSelect: onEdit },
              { label: 'Delete', onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>

      {/* Below the buttons, so these get the card's full width. Like the rest of the card,
          tapping them closes it, so a long note can be closed from the bottom. */}
      <Expand open={open}>
        <div ref={sectionsRef} className="relative">
          <CardSection label={exercise.muscleGroups.length === 1 ? 'Muscle group' : 'Muscle groups'}>
            {groups}
          </CardSection>
          {exercise.note && (
            <CardSection label="Note">
              <span className="whitespace-pre-line">{exercise.note}</span>
            </CardSection>
          )}
        </div>
      </Expand>
    </li>
  )
}


export default function ExercisesPage() {
  const { token, logout } = useAuthStore()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Increasing this re-runs the effect below, which retries loading
  const [attempt, setAttempt] = useState(0)
  // null: dialog closed, 'new': creating, Exercise: editing that exercise
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  // The exercise waiting for delete confirmation, or null when the dialog is closed
  const [deleting, setDeleting] = useState<Exercise | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  // The muscle groups to show. Empty shows every exercise.
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  // How many of the matching exercises are on screen. Changing the search, filter or sort starts
  // again from the first page, so the list never opens partway down.
  const [shownCount, setShownCount] = useState(PAGE_SIZE)

  // Load the exercises when the page opens and on each retry
  useEffect(() => {
    if (!token) return
    // Set on cleanup, so a response to an outdated request doesn't update the state
    let ignore = false

    api.get<Exercise[]>('/exercises')
      .then(({ data }) => {
        if (ignore) return
        setExercises(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [token, attempt, logout])

  // The route is public, so send logged-out users to the login page
  if (!token) return <Navigate to="/login" replace />

  // filter builds a new array, so sort doesn't change the exercises state
  const searchText = search.trim().toLowerCase()
  const visibleExercises = exercises
    .filter((exercise) => exercise.name.toLowerCase().includes(searchText))
    // An exercise matches if it trains any of the picked groups
    .filter((exercise) => groupFilter.length === 0 || exercise.muscleGroups.some((group) => groupFilter.includes(group)))
    .sort((a, b) => {
      const newestFirst = b.createdAt.localeCompare(a.createdAt)
      if (sortBy === 'oldest') return -newestFirst
      // Exercises in the same group stay newest first
      if (sortBy === 'group') return groupRank(a) - groupRank(b) || newestFirst
      return newestFirst
    })

  // Replace the exercise if it was edited, or add it if it's new
  function handleSaved(saved: Exercise, keepOpen = false) {
    setExercises((current) =>
      current.some((e) => e._id === saved._id)
        ? current.map((e) => (e._id === saved._id ? saved : e))
        : [saved, ...current]
    )
    if (!keepOpen) setEditing(null)
  }

  function handleDeleted(id: string) {
    setExercises((current) => current.filter((e) => e._id !== id))
    setDeleting(null)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16">

        <Reveal onLoad className="flex items-center gap-2 mb-6">
          <h1 className={mainPageTitle}>Exercises</h1>
          <PageHelp {...helpText.exercises} />
        </Reveal>

        {status === 'loading' && (
          <Loading>Loading your exercises…</Loading>
        )}

        {status === 'error' && (
          <LoadError what="your exercises" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && exercises.length === 0 && (
          <Hint>
            No exercises yet. Add the movements you train, like bench press or squats.{' '}
            <button onClick={() => setEditing('new')} className={inlineLink}>Create your first exercise</button>.
          </Hint>
        )}

        {status === 'ready' && exercises.length > 0 && (
          // Two rows at every width: searching and creating, then sorting and filtering. The two
          // dropdowns stay together as a pair, so no width can split them.
          <Reveal onLoad delay={60} className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchField
                  label="Search exercises by name"
                  placeholder="Search exercises"
                  value={search}
                  onChange={(value) => { setSearch(value); setShownCount(PAGE_SIZE) }}
                  fill
                />
              </div>
              <NewButton onClick={() => setEditing('new')} />
            </div>
            {/* On phones the pair splits the row in half, so its edges line up with the search row.
                Wider screens give each a fixed width, so the row doesn't shift when a shorter or
                longer option is picked. The buttons say what they do ("Newest first", "All groups"),
                so their labels are only for screen readers. */}
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="min-w-0">
                <label htmlFor="exercise-sort" className="sr-only">Sort by</label>
                <Select
                  id="exercise-sort"
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => { setSortBy(value as SortOption); setShownCount(PAGE_SIZE) }}
                  className={`w-full sm:w-40 ${toolbarField}`}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="exercise-group-filter" className="sr-only">Muscle groups</label>
                <Select
                  id="exercise-group-filter"
                  multiple
                  allLabel="All groups"
                  countLabel={(count) => `${count} groups`}
                  value={groupFilter}
                  options={groupFilterOptions}
                  onChange={(value) => { setGroupFilter(value); setShownCount(PAGE_SIZE) }}
                  className={`w-full sm:w-40 ${toolbarField}`}
                />
              </div>
            </div>
          </Reveal>
        )}

        {status === 'ready' && exercises.length > 0 && visibleExercises.length === 0 && (
          <p className="text-sm text-zinc-400">
            No exercises match your search and filter.{' '}
            <button
              onClick={() => { setSearch(''); setGroupFilter([]); setShownCount(PAGE_SIZE) }}
              className={inlineLink}
            >
              Clear them
            </button>
          </p>
        )}

        {status === 'ready' && visibleExercises.length > 0 && (
          <ul className="flex flex-col gap-2">
            {visibleExercises.slice(0, shownCount).map((exercise, index) => (
              <ExerciseCard
                key={exercise._id}
                exercise={exercise}
                index={index}
                onEdit={() => setEditing(exercise)}
                onDelete={() => setDeleting(exercise)}
              />
            ))}
          </ul>
        )}

        {status === 'ready' && visibleExercises.length > shownCount && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <button onClick={() => setShownCount((count) => count + PAGE_SIZE)} className={secondaryButton}>
              Show more
            </button>
            <p className="text-xs text-zinc-400 tabular-nums">
              Showing {shownCount} of {visibleExercises.length}
            </p>
          </div>
        )}

      </main>

      {/* Dialogs only exist while open, so each one starts with fresh state */}
      {editing && (
        <ExerciseDialog
          exercise={editing === 'new' ? null : editing}
          existing={exercises}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Delete exercise?"
          message={`"${deleting.name}" will be permanently deleted.`}
          path={`/exercises/${deleting._id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => handleDeleted(deleting._id)}
        />
      )}
    </div>
  )
}
