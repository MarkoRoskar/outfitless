import { z } from "zod";
import { MuscleGroup } from "./exercise.type";
import { MAX_NOTE_LENGTH } from "../../common/limits";

// Zod schema for creating a new Exercise
export const createExerciseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  muscleGroups: z.array(z.nativeEnum(MuscleGroup)).min(1).max(9),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
});

// Zod schema for updating an Exercise (all fields optional)
export const updateExerciseSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
	muscleGroups: z.array(z.nativeEnum(MuscleGroup)).min(1).max(9).optional(),
	note: z.string().max(MAX_NOTE_LENGTH).optional(),
});