import { Request, Response } from "express";
import * as authService from "./auth.service";
import { authSchema, changePasswordSchema, deleteAccountSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.validation";
import { AuthRequest } from "../../common/types/shared_types";
import { parse } from "../../common/http";
import { env } from "../../config/env";

// Errors thrown here reach errorMiddleware by themselves (Express 5)

const REFRESH_COOKIE = "refreshToken";

// httpOnly keeps it away from page scripts, and the path means it's only sent to the auth routes
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
} as const;

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions,
    maxAge: authService.REFRESH_TOKEN_LIFETIME_MS,
  });
};

// The refresh token cookie of this browser, if it has one
const refreshCookie = (req: Request): string | undefined => {
  const token = req.cookies?.[REFRESH_COOKIE];
  return typeof token === "string" ? token : undefined;
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = parse(authSchema, req.body, "Validation failed");
  await authService.register(email, password);
  res.status(201).json({ message: "Verification email sent" });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Invalid token" });
  }
  await authService.verifyEmail(token);
  res.json({ message: "Email verified successfully" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = parse(forgotPasswordSchema, req.body, "Validation failed");
  await authService.forgotPassword(email);
  res.json({ message: "If that email exists, a reset link has been sent" });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = parse(resetPasswordSchema, req.body, "Validation failed");
  await authService.resetPassword(token, password);
  res.json({ message: "Password reset successfully" });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = parse(authSchema, req.body, "Validation failed");
  const { refreshToken, ...response } = await authService.login(email, password);
  setRefreshCookie(res, refreshToken);
  res.json(response);
};

export const refresh = async (req: Request, res: Response) => {
  const currentToken = refreshCookie(req);
  if (!currentToken) {
    return res.status(401).json({ message: "Please log in again" });
  }
  const { refreshToken, token } = await authService.refresh(currentToken);
  setRefreshCookie(res, refreshToken);
  res.json({ token });
};

export const logout = async (req: Request, res: Response) => {
  const currentToken = refreshCookie(req);
  if (currentToken) await authService.logout(currentToken);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.json({ message: "Logged out" });
};

// ACCOUNT SETTINGS. These need a logged-in user (see auth.routes.ts), and changing the password
// or deleting the account asks for the password again.

export const getAccount = async (req: AuthRequest, res: Response) => {
  res.json(await authService.getAccount(req.user!.id));
};

// This device stays logged in, so its refresh token is passed along
export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body, "Validation failed");
  await authService.changePassword(req.user!.id, currentPassword, newPassword, refreshCookie(req));
  res.json({ message: "Password changed" });
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const { password } = parse(deleteAccountSchema, req.body, "Validation failed");
  await authService.deleteAccount(req.user!.id, password);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.json({ message: "Account deleted" });
};
