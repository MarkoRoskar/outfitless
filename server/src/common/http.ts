import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "./errors/app.error";

// Checks request data against a schema and returns it, typed. When it doesn't match, it answers
// 400 with the message and what's wrong (Express 5 passes the thrown error to errorMiddleware).
export const parse = <T extends z.ZodType>(schema: T, data: unknown, message = "Invalid data"): z.output<T> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(message, 400, { errors: z.treeifyError(result.error) });
  }
  return result.data;
};

// Answers 400 when a value that should be a MongoDB id isn't one, before it reaches a query
export const requireObjectId = (value: unknown, message = "Invalid ID") => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(message, 400);
  }
};

// For router.param: checks an id in the address, like the :id in /workouts/:id, for every route
// that has it
export const validIdParam = (message = "Invalid ID") =>
  (_req: Request, _res: Response, next: NextFunction, value: string) => {
    requireObjectId(value, message);
    next();
  };
