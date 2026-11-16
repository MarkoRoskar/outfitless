// Upper limits on numbers, so a mistyped or hostile value can't break the charts.
// The client has the same values in client/src/lib/limits.ts.
export const MAX_REPS = 1000;
export const MAX_WEIGHT = 1000;
export const MAX_WEIGHT_INCREMENT = 100;
export const MAX_REST_SECONDS = 3600;

// Sessions copy notes and exercises, so these also keep them under MongoDB's 16 MB document limit
export const MAX_NOTE_LENGTH = 1000;
export const MAX_EXERCISES_PER_WORKOUT = 50;

// How much one account can store, so it can't fill the database
export const MAX_EXERCISES_PER_USER = 300;
export const MAX_WORKOUTS_PER_USER = 300;
export const MAX_ROUTINES_PER_USER = 100;
// Finished workouts kept per account. Finishing one more removes the oldest, so history
// can't grow forever. The client has the same value for the note on the History page.
export const MAX_SESSIONS_PER_USER = 1000;
