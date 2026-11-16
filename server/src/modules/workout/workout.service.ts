import mongoose from "mongoose";
import { Workout } from "./workout.model";
import { WorkoutInput, WorkoutUpdateInput } from "./workout.type";
import { Routine } from "../routine/routine.model";
import { WorkoutExercise } from "../workout_exercise/workout_exercise.model";
import { Session } from "../session/session.model";
import { AppError } from "../../common/errors/app.error";
import { MAX_WORKOUTS_PER_USER } from "../../common/limits";

export const create = async (
  data: WorkoutInput,
  userId: string
) => {
  const count = await Workout.countDocuments({ owner: userId });
  if (count >= MAX_WORKOUTS_PER_USER) {
    throw new AppError(`You've reached the limit of ${MAX_WORKOUTS_PER_USER} workouts`, 409);
  }

  return Workout.create({
    name: data.name,
    note: data.note,
    restBetweenExercises: data.restBetweenExercises,
    owner: userId,
  });
};

// Workouts without an order sort first, newest to oldest, so a new workout starts at the top.
// Each comes with its exercises' names in order, so the list can show what a workout contains.
export const getAll = async (userId: string) => {
  const workouts = await Workout.find({ owner: userId }).sort({ order: 1, createdAt: -1 }).lean();

  // One query for every workout's exercises, rather than one per workout
  const entries = await WorkoutExercise.find({ owner: userId, workoutId: { $in: workouts.map((workout) => workout._id) } })
    .sort({ order: 1, createdAt: 1 })
    .populate<{ exerciseId: { name: string } | null }>("exerciseId", "name")
    .lean();

  return workouts.map((workout) => ({
    ...workout,
    // An exercise deleted from the library leaves nothing to name, so it's skipped
    exerciseNames: entries
      .filter((entry) => entry.workoutId.equals(workout._id))
      .flatMap((entry) => (entry.exerciseId ? [entry.exerciseId.name] : [])),
  }));
};

export const reorder = async (userId: string, ids: string[]) => {
  // ids must be exactly this user's workouts, each listed once
  const workouts = await Workout.find({ owner: userId });
  const workoutIds = new Set(workouts.map((workout) => workout._id.toString()));
  const isComplete = ids.length === workoutIds.size && new Set(ids).size === ids.length && ids.every((id) => workoutIds.has(id));
  if (!isComplete) {
    throw new AppError("Order must include every workout exactly once", 400);
  }

  await Workout.bulkWrite(
    ids.map((id, order) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), owner: new mongoose.Types.ObjectId(userId) },
        update: { $set: { order } },
      },
    }))
  );

  return getAll(userId);
};

export const getById = async (workoutId: string, userId: string) => {
  return Workout.findOne({
    _id: workoutId,
    owner: userId,
  });
};

export const updateById = async (
  workoutId: string,
  userId: string,
  data: WorkoutUpdateInput
) => {
  return Workout.findOneAndUpdate(
    {
      _id: workoutId,
      owner: userId,
    },
    data,
    { returnDocument: "after" }
  );
}

export const deleteById = async (workoutId: string, userId: string) => {
  // Named in the reply, so the client can link to each routine to remove the workout there
  const routines = await Routine.find({ workouts: workoutId, owner: userId })
    .select("name")
    .sort({ name: 1 })
    .lean();
  if (routines.length > 0) {
    throw new AppError(
      routines.length === 1
        ? "This workout is used in a routine. Remove it from the routine first."
        : "This workout is used in routines. Remove it from them first.",
      409,
      { routines: routines.map((r) => ({ _id: r._id.toString(), name: r.name })) }
    );
  }

  const workout = await Workout.findOneAndDelete({
    _id: workoutId,
    owner: userId,
  });

  // Entries belong to the workout, and leftovers would block deleting their exercises.
  // Its sessions go too, including one in progress, so its history doesn't outlive it.
  if (workout) {
    await WorkoutExercise.deleteMany({ workoutId, owner: userId });
    await Session.deleteMany({ workoutId, owner: userId });
  }

  return workout;
};