import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpiry: { type: Date, index: { expireAfterSeconds: 0 } },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    // Finished workouts removed to stay under MAX_SESSIONS_PER_USER, so the dashboard's
    // all-time total still counts them
    removedSessions: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
