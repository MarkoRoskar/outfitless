// The server's limits on numbers (server/src/common/limits.ts and workout_exercise.validation.ts)
export const MAX_SETS = 20
export const MAX_REPS = 1000
export const MAX_WEIGHT = 1000
export const MAX_WEIGHT_INCREMENT = 100
export const MAX_REST_SECONDS = 3600
export const MAX_NOTE_LENGTH = 1000
// Finished workouts the server keeps per account. Older ones are removed as new ones are finished.
export const MAX_SESSIONS_PER_USER = 1000
