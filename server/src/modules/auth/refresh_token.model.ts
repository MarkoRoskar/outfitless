import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    // Only a hash is stored, so a database leak doesn't expose usable tokens
    tokenHash: { type: String, required: true, unique: true },

    // Indexed for logging a user out everywhere, like after a password reset
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Shared by every token descended from one login, so they can be cancelled together
    family: { type: String, required: true, index: true },

    // Set when this token is swapped for a new one. Using it again later suggests it was stolen.
    usedAt: { type: Date, default: null },

    // MongoDB deletes the token once this date has passed
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
