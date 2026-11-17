import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api, { isUnauthorized } from '../lib/axios'
import { accentButton, card, inlineLink, secondaryButton, sectionHeading, mainPageTitle } from '../lib/styles'
import Hint from './Hint'
import { PlayIcon } from './icons'
import { useAuthStore } from '../store/authStore'
import Navbar from './Navbar'
import PageBackdrop from './PageBackdrop'
import WorkoutHistory from './WorkoutHistory'
import type { FinishedSessionsPage } from './WorkoutHistory'
import LoadError from './LoadError'
import PageHelp from './PageHelp'
import { helpText } from '../lib/helpText'
import Loading from './Loading'

interface Named {
  _id: string
  name: string
}

interface Routine extends Named {
  workouts: string[]
  active: boolean
  nextIndex: number
}

interface ActiveSession {
  _id: string
  workoutName: string
}

interface SessionStats {
  thisWeek: number
  total: number
  lastFinishedAt: string | null
}

const MAX_HISTORY = 3

// Monday 00:00 of the current week, in the user's own time zone
function startOfWeek() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

// Whole calendar days between a date and today, so last night counts as "1 day" ago
function daysSince(date: string) {
  const then = new Date(date)
  then.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - then.getTime()) / 86_400_000)
}

// The three dashboard tiles, built to motivate: this week, all time, and how long since the last one
function statTiles(stats: SessionStats) {
  const days = stats.lastFinishedAt ? daysSince(stats.lastFinishedAt) : null
  return [
    { value: String(stats.thisWeek), label: stats.thisWeek === 1 ? 'Workout this week' : 'Workouts this week' },
    { value: String(stats.total), label: 'Workouts done' },
    days === null ? { value: '–', label: 'No workouts yet' }
      : days === 0 ? { value: 'Today', label: 'Last workout' }
      : { value: `${days} ${days === 1 ? 'day' : 'days'}`, label: 'Since last workout' },
  ]
}

// The home page for logged-in users: the next workout, totals, the next setup step and history
export default function Dashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [startError, setStartError] = useState('')
  const [routines, setRoutines] = useState<Routine[]>([])
  const [workouts, setWorkouts] = useState<Named[]>([])
  const [exercises, setExercises] = useState<Named[]>([])
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  // undefined if it couldn't be loaded, which makes WorkoutHistory try again and show its own error
  const [historyPage, setHistoryPage] = useState<FinishedSessionsPage | undefined>(undefined)
  // null if it couldn't be loaded, which hides the tiles
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false

    Promise.all([
      api.get<Routine[]>('/routines'),
      api.get<Named[]>('/workouts'),
      api.get<Named[]>('/exercises'),
      // This only adds the resume card, so a failure shouldn't block the page
      api.get<ActiveSession | null>('/sessions/active').catch(() => ({ data: null })),
      // This only fills History, so a failure shouldn't block the page either
      api.get<FinishedSessionsPage>('/sessions', { params: { limit: MAX_HISTORY } }).catch(() => ({ data: undefined })),
      // The tiles are extra too, so a failure just hides them
      api.get<SessionStats>('/sessions/stats', { params: { weekStart: startOfWeek().toISOString() } }).catch(() => ({ data: null })),
    ])
      .then(([routinesRes, workoutsRes, exercisesRes, activeSessionRes, historyPageRes, statsRes]) => {
        if (ignore) return
        setActiveSession(activeSessionRes.data)
        setHistoryPage(historyPageRes.data)
        setStats(statsRes.data)
        setRoutines(routinesRes.data)
        setWorkouts(workoutsRes.data)
        setExercises(exercisesRes.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        // Logging out clears the token, which makes HomePage show the landing page
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [attempt, logout])

  // Each step needs the one before it, so only the first missing step is shown
  const nextStep =
    exercises.length === 0 ? { text: 'Start by creating the exercises you do.', action: 'Create an exercise', to: '/exercises' }
    : workouts.length === 0 ? { text: 'Next, group your exercises into a workout.', action: 'Create a workout', to: '/workouts' }
    : routines.length === 0 ? { text: 'Next, put your workouts in order as a routine.', action: 'Create a routine', to: '/routines' }
    : !routines.some((routine) => routine.active) ? { text: 'Finally, choose the routine you\'re following to see your next workout here.', action: 'Choose a routine', to: '/routines' }
    : null

  // The next workout in the routine being followed. Editing a routine can leave nextIndex past the end, so it wraps around.
  const activeRoutine = routines.find((routine) => routine.active && routine.workouts.length > 0)
  const nextIndex = activeRoutine ? activeRoutine.nextIndex % activeRoutine.workouts.length : 0
  const nextWorkoutId = activeRoutine?.workouts[nextIndex]

  async function skipNextWorkout() {
    setStartError('')
    setSkipping(true)
    try {
      const { data } = await api.post<Routine>('/routines/active/skip')
      setRoutines((current) => current.map((routine) => (routine._id === data._id ? data : routine)))
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      setStartError('Could not skip the workout. Please try again.')
    } finally {
      setSkipping(false)
    }
  }

  async function startNextWorkout() {
    setStartError('')
    setStarting(true)
    try {
      const { data } = await api.post<ActiveSession>('/sessions', { workoutId: nextWorkoutId })
      navigate(`/sessions/${data._id}`)
    } catch (err) {
      if (isUnauthorized(err)) {
        logout()
        return
      }
      // A 400 means the workout has no exercises, and a 409 that another one is running, so show the server's explanation
      setStartError(
        isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 409)
          ? err.response.data.message
          : 'Could not start the workout. Please try again.'
      )
      setStarting(false)
    }
  }

  function workoutName(id: string) {
    return workouts.find((workout) => workout._id === id)?.name ?? 'Unknown workout'
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-8">

        {/* -mb-2 takes the page's 32px gap down to the 24px the other pages have under their title */}
        <div className="flex items-center gap-2 -mb-2">
          <h1 className={mainPageTitle}>Home</h1>
          <PageHelp {...helpText.home} />
        </div>

        {status === 'loading' && (
          <Loading>Loading your training…</Loading>
        )}

        {status === 'error' && (
          <LoadError what="your training" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && (
          <>
            {activeSession && (
              <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
                <p className="min-w-0 text-sm text-zinc-400 wrap-break-word">{activeSession.workoutName} is in progress.</p>
                <Link to={`/sessions/${activeSession._id}`} className={`inline-flex items-center gap-2 shrink-0 ${accentButton}`}>
                  <PlayIcon size={14} /> Resume workout
                </Link>
              </div>
            )}

            {/* While a workout is running, the resume card above is the next thing to do */}
            {!activeSession && activeRoutine && nextWorkoutId && (
              <div className={`${card} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex flex-col gap-1">
                    <h2 className={sectionHeading}>Next up</h2>
                    {/* Opens the workout's page, to see or change its exercises before starting */}
                    <Link
                      to={`/workouts/${nextWorkoutId}`}
                      className="self-start text-lg font-semibold tracking-tight wrap-break-word hover:text-accent-dim transition-colors duration-200"
                    >
                      {workoutName(nextWorkoutId)}
                    </Link>
                    <p className="text-xs text-zinc-400 wrap-break-word">
                      {nextIndex + 1} of {activeRoutine.workouts.length} in {activeRoutine.name}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={skipNextWorkout}
                      disabled={starting || skipping}
                      aria-label={`Skip ${workoutName(nextWorkoutId)}`}
                      className={`${secondaryButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {skipping ? 'Skipping…' : 'Skip'}
                    </button>
                    <button onClick={startNextWorkout} disabled={starting || skipping} className={`flex items-center gap-2 ${accentButton}`}>
                      {!starting && <PlayIcon size={14} />}
                      {starting ? 'Starting…' : 'Start workout'}
                    </button>
                  </div>
                </div>
                {startError && (
                  <p role="alert" className="text-xs text-red-500">{startError}</p>
                )}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-3 gap-2">
                {statTiles(stats).map((tile) => (
                  <div key={tile.label} className={`${card} min-w-0 flex flex-col gap-1`}>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums whitespace-nowrap">{tile.value}</span>
                    <span className="text-xs text-zinc-400">{tile.label}</span>
                  </div>
                ))}
              </div>
            )}

            {nextStep && (
              <Hint>
                {nextStep.text}{' '}
                <Link to={nextStep.to} className={inlineLink}>{nextStep.action}</Link>.
              </Hint>
            )}

            <WorkoutHistory limit={MAX_HISTORY} initialPage={historyPage} />
          </>
        )}

      </main>
    </div>
  )
}
