export type WorkoutInput = {
  name: string;
  note?: string;
  restBetweenExercises?: number;
};

export type WorkoutUpdateInput = {
  name?: string;
  note?: string;
  restBetweenExercises?: number;
};