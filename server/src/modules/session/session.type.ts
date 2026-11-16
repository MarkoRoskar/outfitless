export type FinishedSessionsQuery = {
  workoutId?: string;
  limit: number;
  before?: string;
  after?: string;
  until?: string;
};

export type LogSetInput = {
  exerciseIndex: number;
  setIndex: number;
  reps: number;
  weight?: number;
  done: boolean;
};

// The parts of a finished session needed to find what was logged the previous time
export type PastSession = {
  exercises: {
    workoutExerciseId: { toString(): string };
    exerciseId: { toString(): string };
    loggedSets: { reps: number; weight?: number | null; done?: boolean | null }[];
  }[];
};

// The parts of a session's exercise that decide its next current numbers
export type ProgressionInput = {
  minReps?: number | null;
  maxReps?: number | null;
  amrap?: boolean | null;
  noWeight?: boolean | null;
  weightIncrement?: number | null;
  loggedSets: { reps: number; weight?: number | null; done?: boolean | null }[];
};

export type EditFinishedSessionInput = {
  exercises: { loggedSets: { reps: number; weight?: number; done: boolean }[] }[];
};
