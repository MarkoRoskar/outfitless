export type WorkoutExerciseInput = {
  workoutId: string;
  exerciseId: string;
  sets: number;
  minReps?: number;
  maxReps?: number;
  amrap: boolean;
  noWeight: boolean;
  currentWeight?: number;
  currentReps: number;
  weightIncrement?: number;
  restTime: number;
};

export type WorkoutExerciseUpdateInput = {
  sets?: number;
  minReps?: number;
  maxReps?: number;
  amrap?: boolean;
  noWeight?: boolean;
  currentWeight?: number;
  currentReps?: number;
  weightIncrement?: number;
  restTime?: number;
};