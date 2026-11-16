import mongoose from "mongoose";

const workoutExerciseSchema = new mongoose.Schema(
  {
    workoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workout",
      required: true,
    },

    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },

    // Position in the workout. Entries created before this field existed don't have it.
    order: {
      type: Number,
      min: 0,
    },

    sets: {
      type: Number,
      required: true,
      min: 1,
    },

    minReps: {
      type: Number,
      required: function (this: { amrap?: boolean }) { return !this.amrap; },
      min: 1,
    },

    maxReps: {
      type: Number,
      required: function (this: { amrap?: boolean }) { return !this.amrap; },
      min: 1,
    },

    // Every set is done for as many reps as possible, so minReps and maxReps aren't stored
    amrap: {
      type: Boolean,
      default: false,
    },

    // Done without added weight, so currentWeight and weightIncrement aren't stored
    noWeight: {
      type: Boolean,
      default: false,
    },

    currentWeight: {
      type: Number,
      required: function (this: { noWeight?: boolean }) { return !this.noWeight; },
      min: 0,
    },

    currentReps: {
      type: Number,
      required: true,
      min: 0,
    },

    weightIncrement: {
      type: Number,
      required: function (this: { noWeight?: boolean }) { return !this.noWeight; },
      min: 0,
    },

    restTime: {
      type: Number,
      default: 120,
      min: 0,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true },
);

// A workout's exercises in order, for its page, starting a session and the Workouts list
workoutExerciseSchema.index({ owner: 1, workoutId: 1, order: 1 });
// Which workouts use an exercise, checked before the exercise can be deleted
workoutExerciseSchema.index({ owner: 1, exerciseId: 1 });

export const WorkoutExercise = mongoose.model(
  "WorkoutExercise",
  workoutExerciseSchema,
);
