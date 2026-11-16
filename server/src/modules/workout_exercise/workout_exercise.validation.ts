import { z } from "zod";
import { MAX_REPS, MAX_REST_SECONDS, MAX_WEIGHT, MAX_WEIGHT_INCREMENT } from "../../common/limits";

// Starting a workout builds one entry per set, so this also protects the server's memory
const MAX_SETS = 20;

export const createWorkoutExerciseSchema = z.object({
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(MAX_SETS),
  minReps: z.number().int().min(1).max(MAX_REPS).optional(),
  maxReps: z.number().int().min(1).max(MAX_REPS).optional(),
  amrap: z.boolean().default(false),
  noWeight: z.boolean().default(false),
  currentWeight: z.number().min(0).max(MAX_WEIGHT).optional(),
  currentReps: z.number().int().min(0).max(MAX_REPS),
  weightIncrement: z.number().min(0).max(MAX_WEIGHT_INCREMENT).optional(),
  restTime: z.number().int().min(0).max(MAX_REST_SECONDS).default(120),
}).refine((data) => data.amrap || (data.minReps !== undefined && data.maxReps !== undefined), {
  message: "minReps and maxReps are required unless amrap is on",
  path: ["minReps"],
}).refine((data) => data.amrap || data.maxReps! >= data.minReps!, {
  message: "maxReps must be >= minReps",
  path: ["maxReps"],
}).refine((data) => data.amrap || (data.currentReps >= data.minReps! && data.currentReps <= data.maxReps!), {
  message: "currentReps must be between minReps and maxReps",
  path: ["currentReps"],
}).refine((data) => data.noWeight || data.currentWeight !== undefined, {
  message: "currentWeight is required unless noWeight is on",
  path: ["currentWeight"],
});

export const reorderWorkoutExercisesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const updateWorkoutExerciseSchema = z.object({
  sets: z.number().int().min(1).max(MAX_SETS).optional(),
  minReps: z.number().int().min(1).max(MAX_REPS).optional(),
  maxReps: z.number().int().min(1).max(MAX_REPS).optional(),
  amrap: z.boolean().optional(),
  noWeight: z.boolean().optional(),
  currentWeight: z.number().min(0).max(MAX_WEIGHT).optional(),
  currentReps: z.number().int().min(0).max(MAX_REPS).optional(),
  weightIncrement: z.number().min(0).max(MAX_WEIGHT_INCREMENT).optional(),
  restTime: z.number().int().min(0).max(MAX_REST_SECONDS).optional(),
});
