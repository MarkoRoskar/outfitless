import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "./auth.model";
import { RefreshToken } from "./refresh_token.model";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../../config/env";
import { AppError } from "../../common/errors/app.error";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../common/email/mailer";
import { Session } from "../session/session.model";
import { Routine } from "../routine/routine.model";
import { WorkoutExercise } from "../workout_exercise/workout_exercise.model";
import { Workout } from "../workout/workout.model";
import { Exercise } from "../exercise/exercise.model";

export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

// Two tabs can refresh at once, and a response can get lost on a bad connection.
// So a token used again this soon is treated as a retry, not as a stolen token.
const REUSE_GRACE_PERIOD_MS = 30 * 1000;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (userId: mongoose.Types.ObjectId) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "30m" });

const issueRefreshToken = async (userId: mongoose.Types.ObjectId, family: string) => {
  const refreshToken = crypto.randomBytes(32).toString("hex");

  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    user: userId,
    family,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
  });

  return refreshToken;
};

export const register = async (email: string, password: string) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.isVerified) {
      throw new AppError("An account with this email already exists", 409);
    }

    // The password stays as it was. Otherwise anyone could replace it, then wait for the
    // real owner to click the new link and give them access to the verified account.
    const verificationToken = crypto.randomBytes(32).toString("hex");
    existingUser.verificationToken = verificationToken;
    existingUser.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await existingUser.save();
    await sendVerificationEmail(email, verificationToken);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  await User.create({
    email,
    password: hashedPassword,
    isVerified: false,
    verificationToken,
    verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await sendVerificationEmail(email, verificationToken);
};

export const verifyEmail = async (token: string) => {
  const user = await User.findOne({
    verificationToken: token,
    verificationExpiry: { $gt: new Date() },
  });
  if (!user) {
    throw new AppError("Invalid or expired verification link", 400);
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpiry = undefined;
  await user.save();
};

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  return {
    user: {
      id: user._id,
      email: user.email,
    },
    token: signAccessToken(user._id),
    refreshToken: await issueRefreshToken(user._id, crypto.randomUUID()),
  };
};

// Swaps a refresh token for a new one and a new access token
export const refresh = async (refreshToken: string) => {
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });

  // MongoDB's cleanup can run late, so the date is checked here too
  if (!stored || stored.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Please log in again", 401);
  }

  if (stored.usedAt && Date.now() - stored.usedAt.getTime() > REUSE_GRACE_PERIOD_MS) {
    await RefreshToken.deleteMany({ family: stored.family });
    throw new AppError("Please log in again", 401);
  }

  if (!stored.usedAt) {
    stored.usedAt = new Date();
    await stored.save();
  }

  return {
    token: signAccessToken(stored.user),
    refreshToken: await issueRefreshToken(stored.user, stored.family),
  };
};

// Cancels this login, including every token descended from it
export const logout = async (refreshToken: string) => {
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (stored) {
    await RefreshToken.deleteMany({ family: stored.family });
  }
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user || !user.isVerified) return;

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetToken = resetToken;
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await sendPasswordResetEmail(email, resetToken);
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset link", 400);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  // A reset may mean someone else got in, so every device has to log in again
  await RefreshToken.deleteMany({ user: user._id });
};

// The logged-in user's account details, for the Settings page
export const getAccount = async (userId: string) => {
  const user = await User.findById(userId).select("email createdAt").lean();
  if (!user) throw new AppError("Please log in again", 401);
  return { email: user.email, createdAt: user.createdAt };
};

// Checks the password of the logged-in user, for changes that need it typed again
const userWithPassword = async (userId: string, password: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("Please log in again", 401);
  if (!(await bcrypt.compare(password, user.password))) {
    // 400 rather than 401, so the client doesn't take it as being logged out
    throw new AppError("That password isn't right", 400);
  }
  return user;
};

// Changes the password. Other devices are logged out, since a change often means the old one
// leaked; this device stays logged in (keepRefreshToken is its login).
export const changePassword = async (userId: string, currentPassword: string, newPassword: string, keepRefreshToken?: string) => {
  const user = await userWithPassword(userId, currentPassword);
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  const current = keepRefreshToken ? await RefreshToken.findOne({ tokenHash: hashToken(keepRefreshToken), user: user._id }) : null;
  await RefreshToken.deleteMany({ user: user._id, ...(current ? { family: { $ne: current.family } } : {}) });
};

// Deletes the account and everything in it: sessions, routines, workouts with their exercises,
// the exercise library and every login. This can't be undone.
export const deleteAccount = async (userId: string, password: string) => {
  const user = await userWithPassword(userId, password);
  const owner = user._id;

  await Promise.all([
    Session.deleteMany({ owner }),
    Routine.deleteMany({ owner }),
    WorkoutExercise.deleteMany({ owner }),
    Workout.deleteMany({ owner }),
    Exercise.deleteMany({ owner }),
    RefreshToken.deleteMany({ user: owner }),
  ]);
  await User.deleteOne({ _id: owner });
};
