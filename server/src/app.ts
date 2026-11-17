import path from "path";
import express from "express";
import mongoose from "mongoose";
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
const production = env.NODE_ENV === "production";

// Online, requests pass through the host's proxy (like Render's). This makes Express use the
// visitor's real address, so the rate limits count each person separately and secure cookies work.
if (production) app.set("trust proxy", 1);

// The app and the API share one address (in development through Vite's proxy), so there's no
// cross-site access to allow and no CORS setup.
app.use(express.json());
app.use(cookieParser());

// For uptime checks, like the ping that keeps a free server awake. It's before the rate limit so
// checks never use it up, and it answers 503 when the database is unreachable.
app.get("/api/health", (_req, res) => {
  const databaseUp = mongoose.connection.readyState === 1;
  res.status(databaseUp ? 200 : 503).json({ status: databaseUp ? "ok" : "database unavailable" });
});

// Makes floods of requests harder. It counts per IP, so people on the same network share a limit.
// While developing, React runs each page's loading twice and refreshing is constant, so 300 a
// minute ran out after about 20 reloads. The production limit stays as it was.
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: production ? 300 : 3000,
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

// Any other /api address is unknown, so it answers in JSON like the rest of the API
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

if (production) {
  // Online, this server also delivers the app: the files from the client build, and index.html for
  // every page address (like /workouts/123) so the app's own router can show the right page.
  // client/dist is two folders up from server/dist.
  const clientBuild = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientBuild, { index: false, maxAge: "1h" }));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
} else {
  // While developing, Vite serves the app on its own port
  app.get("/", (_req, res) => {
    res.send("API running. Open the app at http://localhost:5173");
  });
}

app.use(errorMiddleware);

export default app;
