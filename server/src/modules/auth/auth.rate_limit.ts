import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const limiter = (windowMs: number, limit: number, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });

// Only failed logins count, so logging in normally never uses this up
export const loginLimiter = limiter(FIFTEEN_MINUTES, 10, true);

// These send emails, so they also protect people's inboxes and the Resend quota
export const registerLimiter = limiter(ONE_HOUR, 10);
export const forgotPasswordLimiter = limiter(ONE_HOUR, 5);

export const resetPasswordLimiter = limiter(FIFTEEN_MINUTES, 10);

// Normal use refreshes about every 30 minutes, but several tabs and devices on one network add up
export const refreshLimiter = limiter(FIFTEEN_MINUTES, 60);

// Changing the password and deleting the account ask for the password, so failed tries are limited like logins
export const accountLimiter = limiter(FIFTEEN_MINUTES, 10, true);
