import { Request, Response, NextFunction } from "express";
import { AppError } from "../common/errors/app.error";

// Turns any error from a route into a JSON answer. Expected refusals, like a wrong password or
// invalid data, answer with their own status and message; anything else is logged and answers 500.
export const errorMiddleware = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ ...err.details, message: err.message });
  }

  // Express's own errors for a bad request, like malformed JSON, carry a 4xx status
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: "Invalid request" });
  }

  // Other messages can reveal database details, so they only go to the server's log
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};
