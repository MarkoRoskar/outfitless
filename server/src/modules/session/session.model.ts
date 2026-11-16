import mongoose from "mongoose";

// One planned set. reps and weight start with the exercise's current numbers.
const loggedSetSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true, min: 0 },
    weight: { type: Number, min: 0 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

// A copy of the workout's plan, so editing the workout later can't change this session
const sessionExerciseSchema = new mongoose.Schema(
  {
    workoutExerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutExercise",
      required: true,
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    name: { type: String, required: true },
    note: { type: String },
    sets: { type: Number, required: true, min: 1 },
    minReps: { type: Number, min: 1 },
    maxReps: { type: Number, min: 1 },
    amrap: { type: Boolean, default: false },
    noWeight: { type: Boolean, default: false },
    restTime: { type: Number, default: 120, min: 0 },
    weightIncrement: { type: Number, min: 0 },
    // The exercise's target when the session started, shown under each set that has no
    // "Last time" yet. Sessions started before this was added don't have it.
    targetReps: { type: Number, min: 0 },
    targetWeight: { type: Number, min: 0 },
    loggedSets: { type: [loggedSetSchema], default: [] },

    // What was logged the previous time, shown as the numbers to beat
    lastSets: {
      type: [new mongoose.Schema({ reps: Number, weight: Number }, { _id: false })],
      default: [],
    },
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema(
  {
    workoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workout",
      required: true,
    },
    workoutName: { type: String, required: true },
    workoutNote: { type: String },
    restBetweenExercises: { type: Number, default: 60, min: 0 },
    startedAt: { type: Date, default: Date.now },

    // null while the workout is in progress
    finishedAt: { type: Date, default: null },

    // True from marking it finished until the exercises' current numbers are updated,
    // so finishing again can complete an update that failed partway
    progressionPending: { type: Boolean, default: false },

    exercises: { type: [sessionExerciseSchema], default: [] },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Every lookup is one user's sessions. Without these, each one would scan every user's sessions.
// History, the dashboard stats, "the latest session" and the session in progress (finishedAt null).
sessionSchema.index({ owner: 1, finishedAt: -1 });
// One workout's sessions: its progress chart, and deleting them along with the workout.
sessionSchema.index({ owner: 1, workoutId: 1, finishedAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);
