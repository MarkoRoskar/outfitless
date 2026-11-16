import { Exercise } from "./exercise.model";
import { ExerciseInput, ExerciseUpdateInput } from "./exercise.type";
import { WorkoutExercise } from "../workout_exercise/workout_exercise.model";
import { Workout } from "../workout/workout.model";
import { AppError } from "../../common/errors/app.error";
import { MAX_EXERCISES_PER_USER } from "../../common/limits";

export const create = async (
  data: ExerciseInput,
  userId: string
) => {
  const count = await Exercise.countDocuments({ owner: userId });
  if (count >= MAX_EXERCISES_PER_USER) {
    throw new AppError(`You've reached the limit of ${MAX_EXERCISES_PER_USER} exercises`, 409);
  }

  return Exercise.create({
    name: data.name,
    muscleGroups: data.muscleGroups,
    note: data.note,
    owner: userId,
  });
};

export const getAll = async (userId: string) => {
  return Exercise.find({ owner: userId }).sort({ createdAt: -1 });
};

export const getById = async (exerciseId: string, userId: string) => {
  return Exercise.findOne({
    _id: exerciseId,
    owner: userId,
  });
};

export const updateById = async (
  exerciseId: string,
  userId: string,
  data: ExerciseUpdateInput
) => {
  return Exercise.findOneAndUpdate(
    {
      _id: exerciseId,
      owner: userId,
    },
    data,
    { returnDocument: "after" }
  );
}

export const deleteById = async (exerciseId: string, userId: string) => {
  const workoutIds = await WorkoutExercise.distinct("workoutId", { exerciseId, owner: userId });
  if (workoutIds.length > 0) {
    // Named in the reply, so the client can link to each workout to remove it there
    const workouts = await Workout.find({ _id: { $in: workoutIds }, owner: userId })
      .select("name")
      .sort({ name: 1 })
      .lean();
    throw new AppError(
      workouts.length === 1
        ? "This exercise is used in a workout. Remove it from the workout first."
        : "This exercise is used in workouts. Remove it from them first.",
      409,
      { workouts: workouts.map((w) => ({ _id: w._id.toString(), name: w.name })) }
    );
  }

  return Exercise.findOneAndDelete({
    _id: exerciseId,
    owner: userId,
    });
};