import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validIdParam } from "../../common/http";
import {
  createRoutine,
  getRoutines,
  getRoutineById,
  updateRoutine,
  setActiveRoutine,
  skipActiveRoutineWorkout,
  deleteRoutine,
  reorderRoutines,
} from "./routine.controller";

const router = express.Router();

router.use(authMiddleware);
// Every :id here must be a valid id before it reaches a controller
router.param("id", validIdParam());

router.post("/", createRoutine);
router.post("/active/skip", skipActiveRoutineWorkout);
router.get("/", getRoutines);
router.put("/order", reorderRoutines);
router.get("/:id", getRoutineById);
router.patch("/:id", updateRoutine);
router.put("/:id/active", setActiveRoutine);
router.delete("/:id", deleteRoutine);

export default router;
