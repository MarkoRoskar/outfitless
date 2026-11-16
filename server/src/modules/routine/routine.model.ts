import mongoose from "mongoose";

const routineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    workouts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workout",
      },
    ],

    note: { type: String, trim: true },

    // The routine the user is following. Only one of their routines is active at a time.
    active: { type: Boolean, default: false },

    // Position in workouts of the next workout to do
    nextIndex: { type: Number, default: 0, min: 0 },

    // Position in the user's list. New routines don't have one until the list is first reordered.
    order: { type: Number, min: 0 },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// The Routines list and finding the active routine: both start from one user's routines
routineSchema.index({ owner: 1, createdAt: -1 });
// The Routines list in the user's saved order
routineSchema.index({ owner: 1, order: 1, createdAt: -1 });

export const Routine = mongoose.model("Routine", routineSchema);
