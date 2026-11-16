import express from "express";
import {
  register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword,
  getAccount, changePassword, deleteAccount,
} from "./auth.controller";
import {
  accountLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from "./auth.rate_limit";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

// Account settings
router.get("/account", authMiddleware, getAccount);
router.post("/change-password", authMiddleware, accountLimiter, changePassword);
router.delete("/account", authMiddleware, accountLimiter, deleteAccount);

export default router;
