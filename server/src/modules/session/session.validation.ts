import { z } from "zod";
import { MAX_REPS, MAX_WEIGHT } from "../../common/limits";

export const startSessionSchema = z.object({
  workoutId: z.string().min(1),
});

// Query values arrive as strings, so limit is converted. before is the finishedAt of the last session already loaded.
export const finishedSessionsQuerySchema = z.object({
  workoutId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.iso.datetime().optional(),
  // Only sessions finished at or after this moment, for the History date filter
  after: z.iso.datetime({ offset: true }).optional(),
  // Only sessions finished before this moment, for the History date range's end
  until: z.iso.datetime({ offset: true }).optional(),
});

// When the user's week started, in their own time zone, as an ISO date
export const sessionStatsQuerySchema = z.object({
  weekStart: z.iso.datetime({ offset: true }),
});

export const logSetSchema = z.object({
  exerciseIndex: z.number().int().min(0),
  setIndex: z.number().int().min(0),
  reps: z.number().int().min(0).max(MAX_REPS),
  weight: z.number().min(0).max(MAX_WEIGHT).optional(),
  done: z.boolean(),
});

// Corrected sets for a finished workout: one entry per exercise and per set, in the same order and
// the same numbers as the session already has, since sets can be changed but not added or removed
export const editFinishedSessionSchema = z.object({
  exercises: z.array(z.object({
    loggedSets: z.array(z.object({
      reps: z.number().int().min(0).max(MAX_REPS),
      weight: z.number().min(0).max(MAX_WEIGHT).optional(),
      done: z.boolean(),
    })).max(50),
  })).max(100),
});
