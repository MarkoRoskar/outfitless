import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import { parse } from "../../common/http";
import * as exerciseService from "./exercise.service";
import { createExerciseSchema, updateExerciseSchema } from "./exercise.validation";

// The :id in these routes is checked by router.param in exercise.route.ts, and errors thrown
// here reach errorMiddleware by themselves (Express 5).

export const createExercise = async (req: AuthRequest, res: Response) => {
  const data = parse(createExerciseSchema, req.body, "Invalid exercise data");
  res.status(201).json(await exerciseService.create(data, req.user!.id));
};

export const getExercises = async (req: AuthRequest, res: Response) => {
  res.json(await exerciseService.getAll(req.user!.id));
};

export const getExerciseById = async (req: AuthRequest, res: Response) => {
  const exercise = await exerciseService.getById(req.params.id as string, req.user!.id);
  if (!exercise) return res.status(404).json({ message: "Exercise not found" });
  res.json(exercise);
};

export const updateExercise = async (req: AuthRequest, res: Response) => {
  const data = parse(updateExerciseSchema, req.body, "Invalid exercise data");
  const exercise = await exerciseService.updateById(req.params.id as string, req.user!.id, data);
  if (!exercise) return res.status(404).json({ message: "Exercise not found" });
  res.json(exercise);
};

export const deleteExercise = async (req: AuthRequest, res: Response) => {
  const exercise = await exerciseService.deleteById(req.params.id as string, req.user!.id);
  if (!exercise) return res.status(404).json({ message: "Exercise not found" });
  res.json({ message: "Exercise deleted successfully" });
};
