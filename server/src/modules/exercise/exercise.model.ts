import mongoose from "mongoose";
import { MuscleGroup } from "./exercise.type";

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    muscleGroups: {
      type: [String],
      enum: Object.values(MuscleGroup),
      required: true,
    },

    note: { type: String, trim: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// The Exercises list: one user's exercises, newest first
exerciseSchema.index({ owner: 1, createdAt: -1 });

export const Exercise = mongoose.model("Exercise", exerciseSchema);