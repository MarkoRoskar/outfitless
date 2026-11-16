import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import { parse } from "../../common/http";
import * as routineService from "./routine.service";
import { createRoutineSchema, reorderRoutinesSchema, setActiveRoutineSchema, updateRoutineSchema } from "./routine.validation";

// The :id in these routes is checked by router.param in routine.route.ts, and errors thrown
// here reach errorMiddleware by themselves (Express 5).

export const createRoutine = async (req: AuthRequest, res: Response) => {
  const data = parse(createRoutineSchema, req.body, "Invalid routine data");
  res.status(201).json(await routineService.create(data, req.user!.id));
};

export const getRoutines = async (req: AuthRequest, res: Response) => {
  res.json(await routineService.getAll(req.user!.id));
};

// Saves the order of the Routines list
export const reorderRoutines = async (req: AuthRequest, res: Response) => {
  const { ids } = parse(reorderRoutinesSchema, req.body);
  res.json(await routineService.reorder(req.user!.id, ids));
};

export const getRoutineById = async (req: AuthRequest, res: Response) => {
  const routine = await routineService.getById(req.params.id as string, req.user!.id);
  if (!routine) return res.status(404).json({ message: "Routine not found" });
  res.json(routine);
};

export const updateRoutine = async (req: AuthRequest, res: Response) => {
  const data = parse(updateRoutineSchema, req.body, "Invalid routine data");
  const routine = await routineService.updateById(req.params.id as string, req.user!.id, data);
  if (!routine) return res.status(404).json({ message: "Routine not found" });
  res.json(routine);
};

// Follows or unfollows a routine
export const setActiveRoutine = async (req: AuthRequest, res: Response) => {
  const { active } = parse(setActiveRoutineSchema, req.body, "Invalid routine data");
  const routine = await routineService.setActive(req.params.id as string, req.user!.id, active);
  if (!routine) return res.status(404).json({ message: "Routine not found" });
  res.json(routine);
};

// Moves the followed routine on to its next workout without doing the current one
export const skipActiveRoutineWorkout = async (req: AuthRequest, res: Response) => {
  const routine = await routineService.skipActive(req.user!.id);
  if (!routine) return res.status(404).json({ message: "No active routine" });
  res.json(routine);
};

export const deleteRoutine = async (req: AuthRequest, res: Response) => {
  const routine = await routineService.deleteById(req.params.id as string, req.user!.id);
  if (!routine) return res.status(404).json({ message: "Routine not found" });
  res.json({ message: "Routine deleted successfully" });
};
