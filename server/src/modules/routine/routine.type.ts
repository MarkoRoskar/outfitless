export type RoutineInput = {
  name: string;
  workouts: string[];
  note?: string;
};

export type RoutineUpdateInput = {
  name?: string;
  workouts?: string[];
  note?: string;
};
