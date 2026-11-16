import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validIdParam } from "../../common/http";
import {
  createWorkoutExercise,
  getWorkoutExercises,
  reorderWorkoutExercises,
  getWorkoutExerciseById,
  updateWorkoutExercise,
  deleteWorkoutExercise,
} from "./workout_exercise.controller";

const router = express.Router();

router.use(authMiddleware);
// Every :id here must be a valid id before it reaches a controller
router.param("id", validIdParam());
router.param("workoutId", validIdParam("Invalid workout ID"));

router.post("/", createWorkoutExercise);
router.get("/workout/:workoutId", getWorkoutExercises);
router.put("/workout/:workoutId/order", reorderWorkoutExercises);
router.get("/:id", getWorkoutExerciseById);
router.patch("/:id", updateWorkoutExercise);
router.delete("/:id", deleteWorkoutExercise);

export default router;
