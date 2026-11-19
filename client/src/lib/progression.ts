// The app's progression rule, the same as nextCurrentNumbers in the server's
// session.service.ts, so a workout in progress can show what finishing will do to an
// exercise's target. The server's is the one that counts: keep the two the same.
//
// The exercise's current numbers after these sets, or null if they don't change (always for
// max-rep sets). Current reps always stays inside the range.
//
// With weight, a first set under minReps decides: the increment comes off its weight, at maxReps,
// whatever the later sets did. Otherwise the new target comes from the heaviest set that reached
// minReps, and a set at that weight reaching maxReps adds the increment.
export interface ProgressionInput {
  minReps?: number
  maxReps?: number
  amrap?: boolean
  noWeight?: boolean
  weightIncrement?: number
  loggedSets: { reps: number; weight?: number; done?: boolean }[]
}

// To 2 decimals, so a decimal increment can't leave float noise like 3.3000000000000003 kg
const roundWeight = (weight: number) => Math.round(weight * 100) / 100

export function nextCurrentNumbers(exercise: ProgressionInput): { currentReps: number; currentWeight?: number } | null {
  if (exercise.amrap) return null

  const logged = exercise.loggedSets.filter((set) => set.done)
  if (logged.length === 0) return null

  const first = exercise.loggedSets[0]
  const increment = exercise.weightIncrement ?? 0
  const bestReps = Math.max(...logged.map((set) => set.reps))

  const minReps = exercise.minReps ?? 0
  const maxReps = exercise.maxReps ?? Infinity

  if (exercise.noWeight) {
    if (bestReps > maxReps) return { currentReps: maxReps }
    if (first?.done && first.reps < minReps) return { currentReps: minReps }
    return { currentReps: Math.max(bestReps, minReps) }
  }

  const weightOf = (set: { weight?: number }) => set.weight ?? 0

  // A first set under minReps decides on its own, so a lighter later set can't become the target
  if (first?.done && first.reps < minReps) {
    return { currentReps: maxReps, currentWeight: roundWeight(Math.max(weightOf(first) - increment, 0)) }
  }

  const reached = logged.filter((set) => set.reps >= minReps)
  if (reached.length === 0) {
    return { currentReps: minReps, currentWeight: weightOf(logged[0]) }
  }

  const heaviest = Math.max(...reached.map(weightOf))
  const repsAtHeaviest = Math.max(...reached.filter((set) => weightOf(set) === heaviest).map((set) => set.reps))

  if (repsAtHeaviest >= maxReps) {
    return { currentReps: minReps, currentWeight: roundWeight(heaviest + increment) }
  }
  return { currentReps: repsAtHeaviest, currentWeight: heaviest }
}
