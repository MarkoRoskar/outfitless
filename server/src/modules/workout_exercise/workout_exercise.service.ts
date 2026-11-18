import mongoose from "mongoose";
import { WorkoutExercise } from "./workout_exercise.model";
import { Workout } from "../workout/workout.model";
import { Exercise } from "../exercise/exercise.model";
import { WorkoutExerciseInput, WorkoutExerciseUpdateInput } from "./workout_exercise.type";
import { AppError } from "../../common/errors/app.error";
import { MAX_EXERCISES_PER_WORKOUT } from "../../common/limits";

export const create = async (data: WorkoutExerciseInput, userId: string) => {
  const workout = await Workout.findOne({ _id: data.workoutId, owner: userId });
  if (!workout) throw new AppError("Workout not found", 404);

  const exercise = await Exercise.findOne({ _id: data.exerciseId, owner: userId });
  if (!exercise) throw new AppError("Exercise not found", 404);

  const count = await WorkoutExercise.countDocuments({ workoutId: data.workoutId, owner: userId });
  if (count >= MAX_EXERCISES_PER_WORKOUT) {
    throw new AppError(`A workout can have at most ${MAX_EXERCISES_PER_WORKOUT} exercises`, 409);
  }

  // New entries go to the end of the workout
  const last = await WorkoutExercise.findOne({ workoutId: data.workoutId, owner: userId }).sort({ order: -1 });

  // Fields that don't apply to this entry aren't stored
  const { minReps, maxReps, currentWeight, weightIncrement, ...rest } = data;

  return WorkoutExercise.create({
    ...rest,
    ...(data.amrap ? {} : { minReps, maxReps }),
    ...(data.noWeight ? {} : { currentWeight }),
    // Max-rep targets never change by themselves, so they have no increment
    ...(data.noWeight || data.amrap ? {} : { weightIncrement: weightIncrement ?? 1 }),
    order: (last?.order ?? -1) + 1,
    owner: userId,
  });
};

// Entries without an order sort first, oldest to newest
export const getAllByWorkout = async (workoutId: string, userId: string) => {
  return WorkoutExercise.find({ workoutId, owner: userId }).sort({ order: 1, createdAt: 1 });
};

export const reorder = async (workoutId: string, userId: string, ids: string[]) => {
  const workout = await Workout.findOne({ _id: workoutId, owner: userId });
  if (!workout) throw new AppError("Workout not found", 404);

  // ids must be exactly this workout's entries, each listed once
  const entries = await WorkoutExercise.find({ workoutId, owner: userId });
  const entryIds = new Set(entries.map((entry) => entry._id.toString()));
  const isComplete = ids.length === entryIds.size && new Set(ids).size === ids.length && ids.every((id) => entryIds.has(id));
  if (!isComplete) {
    throw new AppError("Order must include every exercise in the workout exactly once", 400);
  }

  await WorkoutExercise.bulkWrite(
    ids.map((id, order) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), owner: new mongoose.Types.ObjectId(userId) },
        update: { $set: { order } },
      },
    }))
  );

  return getAllByWorkout(workoutId, userId);
};

export const getById = async (id: string, userId: string) => {
  return WorkoutExercise.findOne({ _id: id, owner: userId });
};

export const updateById = async (
  id: string,
  userId: string,
  data: WorkoutExerciseUpdateInput
) => {
  const existing = await WorkoutExercise.findOne({ _id: id, owner: userId });
  if (!existing) return null;

  // An update can send just some of these, so compare against the stored values
  const amrap = data.amrap ?? existing.amrap;
  const noWeight = data.noWeight ?? existing.noWeight;
  const minReps = data.minReps ?? existing.minReps;
  const maxReps = data.maxReps ?? existing.maxReps;
  const currentReps = data.currentReps ?? existing.currentReps;
  const currentWeight = data.currentWeight ?? existing.currentWeight;
  const weightIncrement = data.weightIncrement ?? existing.weightIncrement;

  // Max-rep sets have no rep range to stay inside
  if (!amrap) {
    if (minReps == null || maxReps == null) {
      throw new AppError("minReps and maxReps are required unless amrap is on", 400);
    }
    if (maxReps < minReps) {
      throw new AppError("maxReps must be >= minReps", 400);
    }
    if (currentReps < minReps || currentReps > maxReps) {
      throw new AppError("currentReps must be between minReps and maxReps", 400);
    }
  }
  if (!noWeight && currentWeight == null) {
    throw new AppError("currentWeight is required unless noWeight is on", 400);
  }
  // Switching off max reps on a weighted exercise brings the increment back, starting at 1 kg
  const needsIncrement = !noWeight && !amrap;

  // Fields that no longer apply are removed from the stored entry
  const set = { ...data };
  const unset: Record<string, 1> = {};
  if (amrap) {
    delete set.minReps;
    delete set.maxReps;
    unset.minReps = 1;
    unset.maxReps = 1;
  }
  if (noWeight) {
    delete set.currentWeight;
    unset.currentWeight = 1;
  }
  if (!needsIncrement) {
    delete set.weightIncrement;
    unset.weightIncrement = 1;
  } else if (weightIncrement == null) {
    set.weightIncrement = 1;
  }

  return WorkoutExercise.findOneAndUpdate(
    { _id: id, owner: userId },
    { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
    { returnDocument: "after" }
  );
};

export const deleteById = async (id: string, userId: string) => {
  return WorkoutExercise.findOneAndDelete({ _id: id, owner: userId });
};
