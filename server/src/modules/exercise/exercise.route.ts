import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validIdParam } from "../../common/http";
import {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
} from "./exercise.controller";

const router = express.Router();

router.use(authMiddleware);
// Every :id here must be a valid id before it reaches a controller
router.param("id", validIdParam());

router.post("/", createExercise);
router.get("/", getExercises);
router.get("/:id", getExerciseById);
router.patch("/:id", updateExercise);
router.delete("/:id", deleteExercise);

export default router;