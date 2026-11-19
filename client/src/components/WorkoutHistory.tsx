import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { isUnauthorized } from '../lib/axios'
import { MAX_SESSIONS_PER_USER } from '../lib/limits'
import { card, inlineLink, listLink, pageSectionHeading, secondaryButton, toolbarField } from '../lib/styles'
import { formatDay } from '../lib/dates'
import { useAuthStore } from '../store/authStore'
import ActionMenu from './ActionMenu'
import CardSection from './CardSection'
import ConfirmDeleteDialog from './ConfirmDeleteDialog'
import EditSessionDialog from './EditSessionDialog'
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, TimerIcon } from './icons'
import Hint from './Hint'
import RecordBadge from './RecordBadge'
import LoadError from './LoadError'
import MuscleGroupPhotos from './MuscleGroupPhotos'
import Select from './Select'
import DatePicker from './DatePicker'
import Loading, { Spinner } from './Loading'
import Reveal from './Reveal'
import { listRevealDelay } from '../lib/useReveal'

interface LoggedSet {
  reps: number
  weight?: number
  done: boolean
}

interface SessionExercise {
  name: string
  // The exercise's muscle groups now (none if it was deleted), sent by the server for the photos
  muscleGroups?: string[]
  noWeight: boolean
  loggedSets: LoggedSet[]
  // The set that's a personal record, if any (worked out by the server)
  recordSetIndex?: number
}

export interface FinishedSession {
  _id: string
  workoutId: string
  workoutName: string
  startedAt: string
  finishedAt: string
  exercises: SessionExercise[]
}

// "35 min", or "<1 min" for a workout finished within a minute
function formatDuration(session: FinishedSession) {
  const minutes = Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
  return minutes < 1 ? '<1 min' : `${minutes} min`
}

// One finished workout. The sets stay hidden until the summary is clicked. Its menu always has Edit,
// and Delete only when onDelete is given.
function SessionCard({ session, index, onEdit, onDelete }: { session: FinishedSession; index: number; onEdit: () => void; onDelete?: () => void }) {
  const sets = session.exercises.flatMap((exercise) => exercise.loggedSets)
  const loggedCount = sets.filter((set) => set.done).length
  // Every muscle group the workout worked, each once, in the order the exercises first use them
  const groups = [...new Set(session.exercises.flatMap((exercise) => exercise.muscleGroups ?? []))]

  // How far down the photos reach: the whole closed card, and on an open card only down to the
  // line above the exercises, so the sets are on plain card. Measured as the card opens and
  // closes, like on the other cards. The card is the details' parent.
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [photosHeight, setPhotosHeight] = useState<number>()
  useEffect(() => {
    const card = detailsRef.current?.parentElement
    if (!card) return
    function measure() {
      const cardBox = card!.getBoundingClientRect()
      const line = sectionRef.current?.firstElementChild?.getBoundingClientRect()
      // A closed card's sections aren't drawn, so they have no size. While the card is closing they
      // still show, so the photos keep ending above them: reaching down over the sliding sets for a
      // moment, they'd make room for that text and jump narrower and back.
      const shown = line && line.height > 0
      setPhotosHeight(Math.min(cardBox.height, shown ? line.top - cardBox.top : Infinity))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    // group/card for the photos, which light up when the card is hovered (the details inside
    // already uses group, for open). isolate keeps them at the card's back, behind its text. That
    // makes the card its own layer, so while its ⋯ menu is open the card itself is raised, or the
    // menu would open under the cards below.
    <Reveal as="li" delay={listRevealDelay(index)} className={`${card} group/card relative isolate has-[[role=menu]]:z-30 flex items-start gap-1`}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <MuscleGroupPhotos groups={groups} height={photosHeight} />
      </div>
      <details ref={detailsRef} className="group min-w-0 flex-1">
        <summary className="flex items-start justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          {/* Long names are cut to one line, with all of it on hover and once the card is open */}
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <h3 title={session.workoutName} className="text-base font-semibold tracking-tight truncate group-open:whitespace-normal group-open:wrap-break-word">{session.workoutName}</h3>
            {/* The date, then a timer and a tick in front of the duration and set count, like the
                icons on a workout's page, instead of separating them with dots */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400 tabular-nums">
              <span>{formatDay(session.finishedAt)}</span>
              <span title="How long it took" className="inline-flex items-center gap-1">
                <TimerIcon size={12} className="shrink-0" />
                <span className="sr-only">Took </span>{formatDuration(session)}
              </span>
              <span title="Sets you ticked off, of all the planned sets" className="inline-flex items-center gap-1">
                <CheckIcon size={12} className="shrink-0" />
                {loggedCount} of {sets.length} sets done
              </span>
            </p>
          </div>
          {/* The same 32px button size and spacing as the ⌄ ⋯ on the other cards, so they line up */}
          <span className="shrink-0 -my-1 h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 group-hover:text-zinc-50 transition-colors duration-200">
            <ChevronDownIcon size={18} className="transition-transform duration-200 group-open:rotate-180" />
          </span>
        </summary>

        {/* -mr-9 runs the section under the ⋯ button (32px plus the 4px gap beside it), so its line
            spans the whole card, like the sections on an open exercise card */}
        <div ref={sectionRef} className="-mr-9">
        <CardSection label="Exercises">
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-x-8">
          {/* Every planned set as plain text, numbered like during the workout. A set that wasn't
              ticked off keeps its place as a faded dash, so the sets line up with the plan.
              On wider screens the exercises go in two columns, so a long workout stays short. */}
          {session.exercises.map((exercise, exerciseIndex) => (
            <li key={exerciseIndex} className="min-w-0 flex flex-col gap-1">
              <h4 title={exercise.name} className="text-sm font-semibold truncate">{exercise.name}</h4>
              <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                {exercise.loggedSets.map((set, setIndex) => (
                  <li key={setIndex} className={`flex items-baseline gap-1.5 ${set.done ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    <span className="font-mono font-bold text-accent-dim">{setIndex + 1}</span>
                    {set.done
                      ? (exercise.noWeight ? `${set.reps} reps` : `${set.weight ?? 0} kg × ${set.reps}`)
                      : <span aria-label="skipped">–</span>}
                    {exercise.recordSetIndex === setIndex && <RecordBadge />}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
        </CardSection>
        </div>

        {/* Opens the workout's page with Progress open, to see how this session fits the trend.
            A plain line above it, the full width of the card like the section line, sets it apart. */}
        <div className="-mr-9 mt-3 pt-3 border-t border-white/8">
          <Link
            to={`/workouts/${session.workoutId}#progress`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-dim hover:opacity-80 transition-opacity duration-200"
          >
            See progress
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </details>
      <div className="-my-1">
        <ActionMenu
          itemName={`${session.workoutName} from ${formatDay(session.finishedAt)}`}
          actions={[
            { label: 'Edit', onSelect: onEdit },
            ...(onDelete ? [{ label: 'Delete', onSelect: onDelete, danger: true }] : []),
          ]}
        />
      </div>
    </Reveal>
  )
}

// One page of finished workouts, and whether there are older ones after it
export interface FinishedSessionsPage {
  sessions: FinishedSession[]
  hasMore: boolean
}

// Finished workouts fetched at a time. "Show more" asks the server for the next ones.
// 10, like the Exercises and Workouts lists.
const PAGE_SIZE = 10

// The History page's date filter. Presets first, so the common cases are one tap on a phone, and
// "Custom dates…" for any range, which shows From and To date fields.
type Period = 'any' | '7' | '30' | '90' | 'year' | 'custom'
const periodOptions: { value: Period; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom dates…' },
]

// Midnight at the start of a "2026-11-16" day from a date field, in the user's own time zone
function startOfDay(day: string, addDays = 0) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date + addDays).toISOString()
}

// The date limits to send for a period: after (from, included) and until (up to, not included),
// in the user's own time zone. "Last 7 days" counts today as one of them, so it starts at midnight
// 6 days ago. A custom range includes both of its days, and From and To are swapped if reversed.
function dateParams(period: Period, from: string, to: string): { after?: string; until?: string } {
  if (period === 'any') return {}
  if (period === 'custom') {
    const [first, last] = from && to && from > to ? [to, from] : [from, to]
    return {
      ...(first ? { after: startOfDay(first) } : {}),
      ...(last ? { until: startOfDay(last, 1) } : {}),
    }
  }
  const now = new Date()
  const start = period === 'year'
    ? new Date(now.getFullYear(), 0, 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (Number(period) - 1))
  return { after: start.toISOString() }
}

// Today as "2026-11-16" in the user's own time zone, the latest day the date fields allow
function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// A list of finished workouts, newest first. It loads them itself unless they're passed in as initialPage.
// With a limit, it's the dashboard's short version: a heading, the latest few, a link to the full page, and editing but no deleting.
export default function WorkoutHistory({ limit, initialPage }: { limit?: number; initialPage?: FinishedSessionsPage }) {
  const { logout } = useAuthStore()
  const [sessions, setSessions] = useState<FinishedSession[]>(initialPage?.sessions ?? [])
  const [hasMore, setHasMore] = useState(initialPage?.hasMore ?? false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialPage ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)
  // The workout waiting for delete confirmation, or null when the dialog is closed
  const [deleting, setDeleting] = useState<FinishedSession | null>(null)
  // The workout being corrected, or null when the edit dialog is closed
  const [editing, setEditing] = useState<FinishedSession | null>(null)
  // Shown after saving an edit, saying whether the targets changed too
  const [savedNote, setSavedNote] = useState('')
  // The History page's filters. '' means all workouts. The server applies them, so they cover
  // every finished workout, not just the ones already loaded.
  const [workoutFilter, setWorkoutFilter] = useState('')
  const [period, setPeriod] = useState<Period>('any')
  // The custom range's days, as "2026-11-16", or '' for open-ended
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const filtering = workoutFilter !== '' || period !== 'any'
  // The workouts to pick from, loaded only on the History page. If they can't load, there's just no workout filter.
  const [workoutOptions, setWorkoutOptions] = useState<{ value: string; label: string }[] | null>(null)
  const filterParams = { ...(workoutFilter ? { workoutId: workoutFilter } : {}), ...dateParams(period, fromDate, toDate) }

  useEffect(() => {
    if (limit !== undefined) return
    let ignore = false
    api.get<{ _id: string; name: string }[]>('/workouts')
      .then(({ data }) => {
        if (!ignore) setWorkoutOptions(data.map((workout) => ({ value: workout._id, label: workout.name })))
      })
      .catch(() => {})
    return () => { ignore = true }
  }, [limit])

  // Picking what's already chosen changes nothing, so it mustn't start a load that never comes
  function changeFilters(next: { workout?: string; period?: Period; from?: string; to?: string }) {
    const workoutChanges = next.workout !== undefined && next.workout !== workoutFilter
    const periodChanges = next.period !== undefined && next.period !== period
    const fromChanges = next.from !== undefined && next.from !== fromDate
    const toChanges = next.to !== undefined && next.to !== toDate
    if (!workoutChanges && !periodChanges && !fromChanges && !toChanges) return
    if (next.workout !== undefined) setWorkoutFilter(next.workout)
    if (next.period !== undefined) setPeriod(next.period)
    if (next.from !== undefined) setFromDate(next.from)
    if (next.to !== undefined) setToDate(next.to)
    setStatus('loading')
    setSavedNote('')
  }

  useEffect(() => {
    if (initialPage) return
    let ignore = false

    api.get<FinishedSessionsPage>('/sessions', {
      params: {
        limit: limit ?? PAGE_SIZE,
        ...(workoutFilter ? { workoutId: workoutFilter } : {}),
        ...dateParams(period, fromDate, toDate),
      },
    })
      .then(({ data }) => {
        if (ignore) return
        setSessions(data.sessions)
        setHasMore(data.hasMore)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [initialPage, limit, attempt, logout, workoutFilter, period, fromDate, toDate])

  // Loads the page after the oldest session on screen
  async function loadMore() {
    setLoadMoreError('')
    setLoadingMore(true)
    try {
      const { data } = await api.get<FinishedSessionsPage>('/sessions', {
        params: { limit: PAGE_SIZE, before: sessions[sessions.length - 1].finishedAt, ...filterParams },
      })
      setSessions((current) => [...current, ...data.sessions])
      setHasMore(data.hasMore)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setLoadMoreError('Could not load more workouts. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  function handleEdited(saved: FinishedSession, targetsUpdated: boolean) {
    setSessions((current) => current.map((session) => (session._id === saved._id ? saved : session)))
    setEditing(null)
    setSavedNote(targetsUpdated
      ? `Saved. It was your latest ${saved.workoutName}, so its targets were updated from the corrected sets.`
      : 'Saved. Your targets stay as they were, since a newer workout already set them.')
  }

  function handleDeleted(id: string) {
    setSessions((current) => current.filter((session) => session._id !== id))
    setDeleting(null)
  }

  return (
    <section className="flex flex-col gap-3">
      {limit !== undefined && (
        <Reveal className="flex items-baseline justify-between gap-4">
          <h2 className={pageSectionHeading}>Most recent workouts</h2>
          {hasMore && (
            <Link to="/history" className={listLink}>View all</Link>
          )}
        </Reveal>
      )}

      {/* The History page's filters, styled like the Exercises toolbar. On phones the pair splits
          the row in half. Shown once there's something to filter, and kept while filtering. */}
      {limit === undefined && (filtering || sessions.length > 0) && (
        <Reveal onLoad className="grid grid-cols-2 gap-3 sm:flex mb-1">
          <div className="min-w-0">
            <label htmlFor="history-workout-filter" className="sr-only">Workout</label>
            <Select
              id="history-workout-filter"
              value={workoutFilter}
              options={[{ value: '', label: 'All workouts' }, ...(workoutOptions ?? [])]}
              onChange={(value) => changeFilters({ workout: value })}
              searchable={(workoutOptions?.length ?? 0) > 6}
              searchPlaceholder="Search workouts"
              className={`w-full sm:w-52 ${toolbarField}`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="history-period-filter" className="sr-only">Date</label>
            <Select
              id="history-period-filter"
              value={period}
              options={periodOptions}
              onChange={(value) => changeFilters({ period: value as Period })}
              className={`w-full sm:w-44 ${toolbarField}`}
            />
          </div>
        </Reveal>
      )}

      {/* The custom range's two days, under the filters. Either can be left empty for an open end. */}
      {limit === undefined && period === 'custom' && (
        <div className="grid grid-cols-2 gap-3 sm:flex mb-1">
          {([['From', fromDate, 'from'], ['To', toDate, 'to']] as const).map(([label, value, key]) => (
            <div key={key} className="min-w-0 flex flex-col gap-1">
              <label htmlFor={`history-${key}-date`} className="text-xs text-zinc-400">{label}</label>
              <DatePicker
                id={`history-${key}-date`}
                value={value}
                max={today()}
                onChange={(day) => changeFilters({ [key]: day })}
                // On phones To is the right half of the row, so its calendar opens toward the left
                align={key === 'to' ? 'end' : 'start'}
                className={`w-full sm:w-44 ${toolbarField}`}
              />
            </div>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <Loading>Loading your history…</Loading>
      )}

      {status === 'error' && (
        <LoadError what="your history" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
      )}

      {status === 'ready' && sessions.length === 0 && !filtering && (
        // The same lightbulb hint as the other pages' empty states, with the way to get started
        <Hint>
          No finished workouts yet. Open one of your{' '}
          <Link to="/workouts" className={inlineLink}>workouts</Link>{' '}
          and press Start workout. Once you finish it, it shows up here.
        </Hint>
      )}

      {status === 'ready' && sessions.length === 0 && filtering && (
        <p className="text-sm text-zinc-400">
          No finished workouts match these filters.{' '}
          <button onClick={() => changeFilters({ workout: '', period: 'any', from: '', to: '' })} className={inlineLink}>Clear filters</button>
        </p>
      )}

      {savedNote && (
        <p role="status" className="text-xs text-accent-dim">{savedNote}</p>
      )}

      {status === 'ready' && sessions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sessions.map((session, index) => (
            <SessionCard
              key={session._id}
              session={session}
              index={index}
              onEdit={() => { setSavedNote(''); setEditing(session) }}
              onDelete={limit === undefined ? () => setDeleting(session) : undefined}
            />
          ))}
        </ul>
      )}

      {loadMoreError && (
        <p role="alert" className="text-xs text-red-500">{loadMoreError}</p>
      )}

      {limit === undefined && status === 'ready' && hasMore && sessions.length > 0 && (
        <button onClick={loadMore} disabled={loadingMore} className={`self-center inline-flex items-center gap-2 ${secondaryButton}`}>
          {loadingMore ? <><Spinner />Loading…</> : 'Show more'}
        </button>
      )}

      {/* Only at the very end of a history that has reached the limit, which is when it applies */}
      {limit === undefined && status === 'ready' && !hasMore && sessions.length >= MAX_SESSIONS_PER_USER && (
        <p className="self-center text-xs text-zinc-400">
          Only your latest {MAX_SESSIONS_PER_USER.toLocaleString()} workouts are kept.
        </p>
      )}

      {editing && (
        <EditSessionDialog session={editing} onClose={() => setEditing(null)} onSaved={handleEdited} />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          title="Delete workout from history?"
          message={`"${deleting.workoutName}" from ${formatDay(deleting.finishedAt)} will be permanently deleted. Your targets stay as they were.`}
          path={`/sessions/${deleting._id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => handleDeleted(deleting._id)}
        />
      )}
    </section>
  )
}
