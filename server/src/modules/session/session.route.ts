import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validIdParam } from "../../common/http";
import {
  startSession,
  getFinishedSessions,
  getActiveSession,
  getSessionStats,
  getSessionById,
  logSet,
  finishSession,
  editFinishedSession,
  deleteSession,
} from "./session.controller";

const router = express.Router();

router.use(authMiddleware);
// Every :id here must be a valid id before it reaches a controller
router.param("id", validIdParam());

router.post("/", startSession);
router.get("/", getFinishedSessions);
// These have to come before /:id, or "active" and "stats" would be treated as IDs
router.get("/active", getActiveSession);
router.get("/stats", getSessionStats);
router.get("/:id", getSessionById);
router.patch("/:id/sets", logSet);
// Correcting a finished workout's sets, from History
router.put("/:id/sets", editFinishedSession);
router.post("/:id/finish", finishSession);
router.delete("/:id", deleteSession);

export default router;
