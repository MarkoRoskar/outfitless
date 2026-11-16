import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validIdParam } from "../../common/http";
import {
  createWorkout,
  getWorkouts,
  reorderWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
} from "./workout.controller";

const router = express.Router();

router.use(authMiddleware);
// Every :id here must be a valid id before it reaches a controller
router.param("id", validIdParam());

router.post("/", createWorkout);
router.get("/", getWorkouts);
router.put("/order", reorderWorkouts);
router.get("/:id", getWorkoutById);
router.patch("/:id", updateWorkout);
router.delete("/:id", deleteWorkout);

export default router;