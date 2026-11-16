// details is extra data sent to the client next to the message, like the workouts that still
// use an exercise. Only put safe, user-facing values in it.
export class AppError extends Error {
  constructor(public message: string, public statusCode: number, public details?: Record<string, unknown>) {
    super(message);
  }
}
