import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import { parse } from "../../common/http";
import * as workoutExerciseService from "./workout_exercise.service";
import { createWorkoutExerciseSchema, reorderWorkoutExercisesSchema, updateWorkoutExerciseSchema } from "./workout_exercise.validation";

// The :id and :workoutId in these routes are checked by router.param in workout_exercise.route.ts,
// and errors thrown here reach errorMiddleware by themselves (Express 5).

export const createWorkoutExercise = async (req: AuthRequest, res: Response) => {
  const data = parse(createWorkoutExerciseSchema, req.body);
  res.status(201).json(await workoutExerciseService.create(data, req.user!.id));
};

export const getWorkoutExercises = async (req: AuthRequest, res: Response) => {
  res.json(await workoutExerciseService.getAllByWorkout(req.params.workoutId as string, req.user!.id));
};

// Saves the order of a workout's exercises
export const reorderWorkoutExercises = async (req: AuthRequest, res: Response) => {
  const { ids } = parse(reorderWorkoutExercisesSchema, req.body);
  res.json(await workoutExerciseService.reorder(req.params.workoutId as string, req.user!.id, ids));
};

export const getWorkoutExerciseById = async (req: AuthRequest, res: Response) => {
  const workoutExercise = await workoutExerciseService.getById(req.params.id as string, req.user!.id);
  if (!workoutExercise) return res.status(404).json({ message: "Workout exercise not found" });
  res.json(workoutExercise);
};

export const updateWorkoutExercise = async (req: AuthRequest, res: Response) => {
  const data = parse(updateWorkoutExerciseSchema, req.body);
  const workoutExercise = await workoutExerciseService.updateById(req.params.id as string, req.user!.id, data);
  if (!workoutExercise) return res.status(404).json({ message: "Workout exercise not found" });
  res.json(workoutExercise);
};

export const deleteWorkoutExercise = async (req: AuthRequest, res: Response) => {
  const workoutExercise = await workoutExerciseService.deleteById(req.params.id as string, req.user!.id);
  if (!workoutExercise) return res.status(404).json({ message: "Workout exercise not found" });
  res.json({ message: "Workout exercise deleted successfully" });
};
