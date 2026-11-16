import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    note: { type: String, trim: true },

    restBetweenExercises: { type: Number, default: 60, min: 0 },

    // Position in the user's list. New workouts don't have one until the list is first reordered.
    order: { type: Number, min: 0 },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// The Workouts list: one user's workouts in their saved order
workoutSchema.index({ owner: 1, order: 1, createdAt: -1 });

export const Workout = mongoose.model("Workout", workoutSchema);
