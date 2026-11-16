import { Response } from "express";
import { AuthRequest } from "../../common/types/shared_types";
import { parse, requireObjectId } from "../../common/http";
import * as sessionService from "./session.service";
import { editFinishedSessionSchema, finishedSessionsQuerySchema, logSetSchema, sessionStatsQuerySchema, startSessionSchema } from "./session.validation";

// The :id in these routes is checked by router.param in session.route.ts, and errors thrown
// here reach errorMiddleware by themselves (Express 5). Sessions are sent with the current names
// of their workout and exercises, and finished ones with their personal records too.

export const startSession = async (req: AuthRequest, res: Response) => {
  const { workoutId } = parse(startSessionSchema, req.body);
  requireObjectId(workoutId, "Invalid workout ID");
  res.status(201).json(await sessionService.start(workoutId, req.user!.id));
};

// One page of History, optionally filtered by workout and dates
export const getFinishedSessions = async (req: AuthRequest, res: Response) => {
  const query = parse(finishedSessionsQuerySchema, req.query);
  if (query.workoutId !== undefined) requireObjectId(query.workoutId, "Invalid workout ID");
  const page = await sessionService.getFinished(req.user!.id, query);
  res.json({ ...page, sessions: await sessionService.presentFinished(page.sessions, req.user!.id) });
};

export const getSessionStats = async (req: AuthRequest, res: Response) => {
  const { weekStart } = parse(sessionStatsQuerySchema, req.query);
  res.json(await sessionService.getStats(req.user!.id, new Date(weekStart)));
};

// The workout in progress, or null
export const getActiveSession = async (req: AuthRequest, res: Response) => {
  res.json(await sessionService.withCurrentName(await sessionService.getActive(req.user!.id), req.user!.id));
};

export const getSessionById = async (req: AuthRequest, res: Response) => {
  const session = await sessionService.getById(req.params.id as string, req.user!.id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json(await sessionService.withCurrentName(session, req.user!.id));
};

// Saves one set of the workout in progress
export const logSet = async (req: AuthRequest, res: Response) => {
  const data = parse(logSetSchema, req.body);
  const session = await sessionService.logSet(req.params.id as string, req.user!.id, data);
  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json(await sessionService.withCurrentName(session, req.user!.id));
};

// Corrects the sets of a finished workout, from History
export const editFinishedSession = async (req: AuthRequest, res: Response) => {
  const data = parse(editFinishedSessionSchema, req.body);
  const edited = await sessionService.editFinished(req.params.id as string, req.user!.id, data);
  if (!edited) return res.status(404).json({ message: "Session not found" });
  const [session] = await sessionService.presentFinished([edited.session], req.user!.id);
  res.json({ ...edited, session });
};

// Finishes the workout in progress and updates the targets
export const finishSession = async (req: AuthRequest, res: Response) => {
  const result = await sessionService.finish(req.params.id as string, req.user!.id);
  if (!result) return res.status(404).json({ message: "Session not found" });
  const [session] = await sessionService.presentFinished([result.session], req.user!.id);
  res.json({ ...result, session });
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  const session = await sessionService.deleteById(req.params.id as string, req.user!.id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json({ message: "Session deleted successfully" });
};
