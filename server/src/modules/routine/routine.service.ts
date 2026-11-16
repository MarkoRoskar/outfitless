import mongoose from "mongoose";
import { Routine } from "./routine.model";
import { RoutineInput, RoutineUpdateInput } from "./routine.type";
import { Workout } from "../workout/workout.model";
import { AppError } from "../../common/errors/app.error";
import { MAX_ROUTINES_PER_USER } from "../../common/limits";

// A routine can repeat a workout (Push / Pull / Push), so compare against the unique IDs
const assertWorkoutsExist = async (workouts: string[], userId: string) => {
  const uniqueWorkouts = [...new Set(workouts)];
  const workoutCount = await Workout.countDocuments({
    _id: { $in: uniqueWorkouts },
    owner: userId,
  });

  if (workoutCount !== uniqueWorkouts.length) {
    throw new AppError("One or more workouts not found", 404);
  }
};

export const create = async (data: RoutineInput, userId: string) => {
  const count = await Routine.countDocuments({ owner: userId });
  if (count >= MAX_ROUTINES_PER_USER) {
    throw new AppError(`You've reached the limit of ${MAX_ROUTINES_PER_USER} routines`, 409);
  }

  await assertWorkoutsExist(data.workouts, userId);

  return Routine.create({
    name: data.name,
    workouts: data.workouts,
    note: data.note,
    owner: userId,
  });
};

// Routines without an order sort first, newest to oldest, so a new routine starts at the top
export const getAll = async (userId: string) => {
  return Routine.find({ owner: userId }).sort({ order: 1, createdAt: -1 });
};

// Saves the order of the Routines list, the same way as for workouts
export const reorder = async (userId: string, ids: string[]) => {
  // ids must be exactly this user's routines, each listed once
  const routines = await Routine.find({ owner: userId }).select("_id");
  const routineIds = new Set(routines.map((routine) => routine._id.toString()));
  const isComplete = ids.length === routineIds.size && new Set(ids).size === ids.length && ids.every((id) => routineIds.has(id));
  if (!isComplete) {
    throw new AppError("Order must include every routine exactly once", 400);
  }

  await Routine.bulkWrite(
    ids.map((id, order) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), owner: new mongoose.Types.ObjectId(userId) },
        update: { $set: { order } },
      },
    }))
  );

  return getAll(userId);
};

export const getById = async (routineId: string, userId: string) => {
  return Routine.findOne({ _id: routineId, owner: userId });
};

export const updateById = async (
  routineId: string,
  userId: string,
  data: RoutineUpdateInput
) => {
  if (data.workouts) {
    await assertWorkoutsExist(data.workouts, userId);
  }

  return Routine.findOneAndUpdate(
    { _id: routineId, owner: userId },
    data,
    { returnDocument: "after" }
  );
};

export const setActive = async (routineId: string, userId: string, active: boolean) => {
  const routine = await getById(routineId, userId);
  if (!routine) return null;

  if (active) {
    await Routine.updateMany({ owner: userId, active: true }, { active: false });
  }

  return Routine.findOneAndUpdate(
    { _id: routineId, owner: userId },
    { active },
    { returnDocument: "after" }
  );
};

// Moves the active routine on if the finished workout is the one it's waiting for. Editing a
// routine can leave nextIndex past the end, so it wraps around here and on the client.
export const advanceActive = async (workoutId: mongoose.Types.ObjectId, userId: string) => {
  const routine = await Routine.findOne({ owner: userId, active: true });
  if (!routine || routine.workouts.length === 0) return;

  const index = routine.nextIndex % routine.workouts.length;
  if (!routine.workouts[index].equals(workoutId)) return;

  routine.nextIndex = (index + 1) % routine.workouts.length;
  await routine.save();
};

// Moves the active routine on without doing its next workout
export const skipActive = async (userId: string) => {
  const routine = await Routine.findOne({ owner: userId, active: true });
  if (!routine || routine.workouts.length === 0) return null;

  routine.nextIndex = (routine.nextIndex % routine.workouts.length + 1) % routine.workouts.length;
  return routine.save();
};

export const deleteById = async (routineId: string, userId: string) => {
  return Routine.findOneAndDelete({ _id: routineId, owner: userId });
};
