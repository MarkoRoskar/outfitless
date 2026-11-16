import { z } from "zod";
import { MAX_NOTE_LENGTH } from "../../common/limits";

export const createRoutineSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  workouts: z.array(z.string().min(1)).min(1).max(30),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
});

export const reorderRoutinesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const setActiveRoutineSchema = z.object({
  active: z.boolean(),
});

export const updateRoutineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  workouts: z.array(z.string().min(1)).min(1).max(30).optional(),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
});
