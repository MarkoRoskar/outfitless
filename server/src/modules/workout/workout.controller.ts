import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import { parse } from "../../common/http";
import * as workoutService from "./workout.service";
import { createWorkoutSchema, reorderWorkoutsSchema, updateWorkoutSchema } from "./workout.validation";

// The :id in these routes is checked by router.param in workout.route.ts, and errors thrown
// here reach errorMiddleware by themselves (Express 5).

export const createWorkout = async (req: AuthRequest, res: Response) => {
  const data = parse(createWorkoutSchema, req.body, "Invalid workout data");
  res.status(201).json(await workoutService.create(data, req.user!.id));
};

export const getWorkouts = async (req: AuthRequest, res: Response) => {
  res.json(await workoutService.getAll(req.user!.id));
};

// Saves the order of the Workouts list
export const reorderWorkouts = async (req: AuthRequest, res: Response) => {
  const { ids } = parse(reorderWorkoutsSchema, req.body);
  res.json(await workoutService.reorder(req.user!.id, ids));
};

export const getWorkoutById = async (req: AuthRequest, res: Response) => {
  const workout = await workoutService.getById(req.params.id as string, req.user!.id);
  if (!workout) return res.status(404).json({ message: "Workout not found" });
  res.json(workout);
};

export const updateWorkout = async (req: AuthRequest, res: Response) => {
  const data = parse(updateWorkoutSchema, req.body, "Invalid workout data");
  const workout = await workoutService.updateById(req.params.id as string, req.user!.id, data);
  if (!workout) return res.status(404).json({ message: "Workout not found" });
  res.json(workout);
};

export const deleteWorkout = async (req: AuthRequest, res: Response) => {
  const workout = await workoutService.deleteById(req.params.id as string, req.user!.id);
  if (!workout) return res.status(404).json({ message: "Workout not found" });
  res.json({ message: "Workout deleted successfully" });
};
