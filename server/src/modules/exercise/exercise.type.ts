export enum MuscleGroup {
  CHEST = "chest",
  BACK = "back",
  LEGS = "legs",
  SHOULDERS = "shoulders",
  BICEPS = "biceps",
  TRICEPS = "triceps",
  CORE = "core",
  FULL_BODY = "full_body",
  OTHER = "other",
}

export type ExerciseInput = {
  name: string;
  muscleGroups: MuscleGroup[];
  note?: string;
};

export type ExerciseUpdateInput = {
  name?: string;
  muscleGroups?: MuscleGroup[];
  note?: string;
};