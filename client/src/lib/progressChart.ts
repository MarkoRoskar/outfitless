export interface ChartSession {
  _id: string
  finishedAt: string
  exercises: {
    exerciseId: string
    name: string
    amrap: boolean
    noWeight: boolean
    loggedSets: { reps: number; weight?: number; done: boolean }[]
  }[]
}

// One exercise's best numbers in one session. They may not come from the same set.
export interface ExerciseStat {
  maxReps: number
  maxWeight?: number
}

export interface ChartPoint {
  id: string
  date: string
  stats: Record<string, ExerciseStat>
  // One weight_<exerciseId> or reps_<exerciseId> value for each line with a dot on this session
  [lineKey: `weight_${string}` | `reps_${string}`]: number
}

export interface ChartExercise {
  id: string
  name: string
  hasWeight: boolean
  // Max-rep and no-weight exercises improve through reps, so they get a line on the reps chart
  tracksReps: boolean
}

export const weightKey = (exerciseId: string) => `weight_${exerciseId}` as const
export const repsKey = (exerciseId: string) => `reps_${exerciseId}` as const

export function formatStat(stat: ExerciseStat) {
  return stat.maxWeight === undefined
    ? `${stat.maxReps} reps`
    : `${stat.maxWeight} kg, ${stat.maxReps} reps`
}

// Turns sessions, which the API sends newest first, into one chart point per session, oldest first.
// Exercises are grouped by ID, so a renamed exercise stays one line and takes its newest name.
export function buildChartData(sessions: ChartSession[]) {
  const exercises = new Map<string, ChartExercise>()

  const points = [...sessions].reverse().map((session) => {
    const point: ChartPoint = { id: session._id, date: session.finishedAt, stats: {} }

    for (const exercise of session.exercises) {
      const logged = exercise.loggedSets.filter((set) => set.done)
      if (logged.length === 0) continue

      // The same exercise can appear twice in a workout, so build on any earlier stat
      const earlier = point.stats[exercise.exerciseId]
      const stat: ExerciseStat = {
        maxReps: Math.max(earlier?.maxReps ?? 0, ...logged.map((set) => set.reps)),
      }
      if (!exercise.noWeight) {
        stat.maxWeight = Math.max(earlier?.maxWeight ?? 0, ...logged.map((set) => set.weight ?? 0))
        point[weightKey(exercise.exerciseId)] = stat.maxWeight
      } else if (earlier?.maxWeight !== undefined) {
        stat.maxWeight = earlier.maxWeight
      }
      const tracksReps = exercise.amrap || exercise.noWeight
      if (tracksReps) {
        point[repsKey(exercise.exerciseId)] = stat.maxReps
      }
      point.stats[exercise.exerciseId] = stat

      const known = exercises.get(exercise.exerciseId)
      exercises.set(exercise.exerciseId, {
        id: exercise.exerciseId,
        name: exercise.name,
        hasWeight: (known?.hasWeight ?? false) || !exercise.noWeight,
        tracksReps: (known?.tracksReps ?? false) || tracksReps,
      })
    }

    return point
  })

  return { points, exercises: [...exercises.values()] }
}
