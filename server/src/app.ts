import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./modules/auth/auth.routes";
import exerciseRoutes from "./modules/exercise/exercise.route";
import workoutRoutes from "./modules/workout/workout.route";
import workoutExerciseRoutes from "./modules/workout_exercise/workout_exercise.route";
import routineRoutes from "./modules/routine/routine.route";
import sessionRoutes from "./modules/session/session.route";
import { errorMiddleware } from "./middleware/error.middleware";
import { env } from "./config/env";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
// Makes floods of requests harder. It counts per IP, so people on the same network share a limit.
// While developing, React runs each page's loading twice and refreshing is constant, so 300 a
// minute ran out after about 20 reloads. The production limit stays as it was.
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "production" ? 300 : 3000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a minute." },
}));
app.use("/api/auth", authRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/workout-exercises", workoutExerciseRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/sessions", sessionRoutes);
app.get("/", (_, res) => {
  res.send("API running...");
});

app.use(errorMiddleware);

export default app;