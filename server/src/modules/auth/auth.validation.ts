import { z } from "zod";

export const authSchema = z.object({
  email: z.email("Invalid email format").max(100, "Email must be less than 100 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be less than 100 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email format").max(100, "Email must be less than 100 characters"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "You must be logged in to reset your password"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

const newPassword = z.string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password must be less than 100 characters");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword,
});

// Deleting the account asks for the password again, so a forgotten open tab can't be used for it
export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(100),
});
