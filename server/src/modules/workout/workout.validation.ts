import { z } from "zod";
import { MAX_NOTE_LENGTH, MAX_REST_SECONDS } from "../../common/limits";

// Zod schema for creating a new Workout
export const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
  restBetweenExercises: z.number().int().min(0).max(MAX_REST_SECONDS).optional(),
});

export const reorderWorkoutsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

// Zod schema for updating a Workout (all fields optional)
export const updateWorkoutSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    note: z.string().max(MAX_NOTE_LENGTH).optional(),
    restBetweenExercises: z.number().int().min(0).max(MAX_REST_SECONDS).optional(),
});
