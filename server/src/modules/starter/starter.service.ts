import mongoose from "mongoose";
import { Exercise } from "../exercise/exercise.model";
import { MuscleGroup } from "../exercise/exercise.type";
import { Workout } from "../workout/workout.model";
import { WorkoutExercise } from "../workout_exercise/workout_exercise.model";
import { Routine } from "../routine/routine.model";
import { AppError } from "../../common/errors/app.error";

// The starter kit: a ready Push / Pull / Legs routine for a new account, so the app isn't empty
// on day one. Each exercise comes with its muscle groups and a plan: sets, a rep range, a light
// starting weight and how much it goes up. The weights are placeholders to change; the
// progression rule moves them on from the first workout.

interface StarterEntry {
  name: string;
  muscleGroups: MuscleGroup[];
  sets: number;
  minReps: number;
  maxReps: number;
  restTime: number;
  // Left out for an exercise done without added weight
  weight?: number;
  increment?: number;
}

const { CHEST, BACK, LEGS, SHOULDERS, BICEPS, TRICEPS, CORE } = MuscleGroup;

export const starterWorkouts: { name: string; note: string; exercises: StarterEntry[] }[] = [
  {
    name: "Push Day",
    note: "Chest, shoulders and triceps. Start light and let the weights climb.",
    exercises: [
      { name: "Bench Press", muscleGroups: [CHEST, TRICEPS], sets: 3, minReps: 6, maxReps: 10, restTime: 150, weight: 40, increment: 2.5 },
      { name: "Overhead Press", muscleGroups: [SHOULDERS, TRICEPS], sets: 3, minReps: 6, maxReps: 10, restTime: 120, weight: 20, increment: 2.5 },
      { name: "Incline Dumbbell Press", muscleGroups: [CHEST, SHOULDERS], sets: 3, minReps: 8, maxReps: 12, restTime: 90, weight: 12, increment: 2 },
      { name: "Lateral Raise", muscleGroups: [SHOULDERS], sets: 3, minReps: 12, maxReps: 20, restTime: 60, weight: 5, increment: 1 },
      { name: "Triceps Pushdown", muscleGroups: [TRICEPS], sets: 3, minReps: 10, maxReps: 15, restTime: 60, weight: 15, increment: 2.5 },
    ],
  },
  {
    name: "Pull Day",
    note: "Back and biceps. Pull-ups go by reps, so add a rep whenever you can.",
    exercises: [
      { name: "Pull-up", muscleGroups: [BACK, BICEPS], sets: 3, minReps: 4, maxReps: 10, restTime: 120 },
      { name: "Barbell Row", muscleGroups: [BACK, BICEPS], sets: 3, minReps: 6, maxReps: 10, restTime: 120, weight: 40, increment: 2.5 },
      { name: "Lat Pulldown", muscleGroups: [BACK], sets: 3, minReps: 8, maxReps: 12, restTime: 90, weight: 35, increment: 2.5 },
      { name: "Face Pull", muscleGroups: [SHOULDERS, BACK], sets: 3, minReps: 12, maxReps: 20, restTime: 60, weight: 15, increment: 2.5 },
      { name: "Dumbbell Curl", muscleGroups: [BICEPS], sets: 3, minReps: 8, maxReps: 12, restTime: 60, weight: 8, increment: 1 },
    ],
  },
  {
    name: "Leg Day",
    note: "Legs and core. Squats first, while you are fresh.",
    exercises: [
      { name: "Squat", muscleGroups: [LEGS, CORE], sets: 3, minReps: 5, maxReps: 8, restTime: 180, weight: 50, increment: 2.5 },
      { name: "Romanian Deadlift", muscleGroups: [LEGS, BACK], sets: 3, minReps: 8, maxReps: 12, restTime: 120, weight: 40, increment: 2.5 },
      { name: "Leg Press", muscleGroups: [LEGS], sets: 3, minReps: 10, maxReps: 15, restTime: 90, weight: 80, increment: 5 },
      { name: "Standing Calf Raise", muscleGroups: [LEGS], sets: 3, minReps: 12, maxReps: 20, restTime: 60, weight: 40, increment: 5 },
      { name: "Hanging Leg Raise", muscleGroups: [CORE], sets: 3, minReps: 8, maxReps: 15, restTime: 60 },
    ],
  },
];

const ROUTINE = {
  name: "Push Pull Legs",
  note: "Three workouts in turn. Do them on any days you like; the next one is always on your home screen.",
};

// Adds the kit to an empty account and follows its routine, so the home screen shows Push Day
// next. Only for an account with no exercises, workouts or routines yet, so nothing is doubled.
// If something fails half way, what was already created is removed again, so trying once more
// starts clean.
export const addStarterKit = async (userId: string) => {
  const owner = new mongoose.Types.ObjectId(userId);
  const [exerciseCount, workoutCount, routineCount] = await Promise.all([
    Exercise.countDocuments({ owner }),
    Workout.countDocuments({ owner }),
    Routine.countDocuments({ owner }),
  ]);
  if (exerciseCount > 0 || workoutCount > 0 || routineCount > 0) {
    throw new AppError("The starter kit is only for a new account with nothing in it yet", 409);
  }

  const created = {
    exercises: [] as mongoose.Types.ObjectId[],
    workouts: [] as mongoose.Types.ObjectId[],
    routine: null as mongoose.Types.ObjectId | null,
  };
  try {
    for (const [workoutIndex, plan] of starterWorkouts.entries()) {
      const workout = await Workout.create({ name: plan.name, note: plan.note, restBetweenExercises: 120, order: workoutIndex, owner });
      created.workouts.push(workout._id);

      const exercises = await Exercise.insertMany(
        plan.exercises.map((entry) => ({ name: entry.name, muscleGroups: entry.muscleGroups, owner }))
      );
      created.exercises.push(...exercises.map((exercise) => exercise._id));

      await WorkoutExercise.insertMany(plan.exercises.map((entry, order) => {
        const noWeight = entry.weight === undefined;
        return {
          workoutId: workout._id,
          exerciseId: exercises[order]._id,
          order,
          sets: entry.sets,
          minReps: entry.minReps,
          maxReps: entry.maxReps,
          amrap: false,
          noWeight,
          // The target starts at the bottom of the range, the easiest place to begin
          currentReps: entry.minReps,
          ...(noWeight ? {} : { currentWeight: entry.weight, weightIncrement: entry.increment }),
          restTime: entry.restTime,
          owner,
        };
      }));
    }

    const routine = await Routine.create({ ...ROUTINE, workouts: created.workouts, active: true, nextIndex: 0, owner });
    created.routine = routine._id;
    return routine;
  } catch (err) {
    await Promise.allSettled([
      WorkoutExercise.deleteMany({ owner, workoutId: { $in: created.workouts } }),
      Workout.deleteMany({ owner, _id: { $in: created.workouts } }),
      Exercise.deleteMany({ owner, _id: { $in: created.exercises } }),
      ...(created.routine ? [Routine.deleteOne({ owner, _id: created.routine })] : []),
    ]);
    throw err;
  }
};
