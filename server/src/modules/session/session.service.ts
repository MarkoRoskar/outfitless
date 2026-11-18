import mongoose from "mongoose";
import { Session } from "./session.model";
import { EditFinishedSessionInput, FinishedSessionsQuery, LogSetInput, PastSession, ProgressionInput } from "./session.type";
import { Workout } from "../workout/workout.model";
import { Exercise } from "../exercise/exercise.model";
import { WorkoutExercise } from "../workout_exercise/workout_exercise.model";
import { getAllByWorkout } from "../workout_exercise/workout_exercise.service";
import { advanceActive } from "../routine/routine.service";
import { AppError } from "../../common/errors/app.error";
import { MAX_SESSIONS_PER_USER } from "../../common/limits";
import { User } from "../auth/auth.model";

// The exercise's current numbers after a finished session, or null if they shouldn't change
// (always for max-rep sets).
// Current reps always stays inside the range.
//
// With weight, the new target comes from the heaviest set that reached minReps, so a heavier
// set anywhere in the session counts (20, 20, 21 kg × 8 makes 21 kg the target). Then:
// - a set at that weight above maxReps adds the increment
// - when no set reached minReps and the first set was under it, the increment comes off
//   the first set's weight
export const nextCurrentNumbers = (exercise: ProgressionInput) => {
  // Max-rep sets have no range to progress through, so their targets only change when edited
  if (exercise.amrap) return null;

  const logged = exercise.loggedSets.filter((set) => set.done);
  if (logged.length === 0) return null;

  const first = exercise.loggedSets[0];
  const increment = exercise.weightIncrement ?? 0;
  const bestReps = Math.max(...logged.map((set) => set.reps));

  const minReps = exercise.minReps ?? 0;
  const maxReps = exercise.maxReps ?? Infinity;

  // Without weight, reps are all there is: over the range caps at max, a low first set drops to
  // min, and otherwise the best set becomes the target
  if (exercise.noWeight) {
    if (bestReps > maxReps) return { currentReps: maxReps };
    if (first?.done && first.reps < minReps) return { currentReps: minReps };
    return { currentReps: Math.max(bestReps, minReps) };
  }

  const weightOf = (set: { weight?: number | null }) => set.weight ?? 0;
  const reached = logged.filter((set) => set.reps >= minReps);

  if (reached.length === 0) {
    const firstWeight = weightOf(logged[0]);
    return first?.done && first.reps < minReps
      ? { currentReps: maxReps, currentWeight: Math.max(firstWeight - increment, 0) }
      : { currentReps: minReps, currentWeight: firstWeight };
  }

  const heaviest = Math.max(...reached.map(weightOf));
  const repsAtHeaviest = Math.max(...reached.filter((set) => weightOf(set) === heaviest).map((set) => set.reps));

  if (repsAtHeaviest > maxReps) {
    return { currentReps: minReps, currentWeight: heaviest + increment };
  }
  return { currentReps: repsAtHeaviest, currentWeight: heaviest };
};

// How many past sessions to search for what was logged the previous time
const LAST_SETS_SEARCH_LIMIT = 100;

// The sets logged the previous time, from sessions sorted newest first. This same entry in the
// workout comes first, because the same exercise elsewhere may use a very different weight.
export const findLastSets = (
  sessions: PastSession[],
  workoutExerciseId: string,
  exerciseId: string
) => {
  const pastEntries = sessions
    .flatMap((session) => session.exercises)
    .map((exercise) => ({
      workoutExerciseId: exercise.workoutExerciseId.toString(),
      exerciseId: exercise.exerciseId.toString(),
      logged: exercise.loggedSets.filter((set) => set.done),
    }))
    .filter((exercise) => exercise.logged.length > 0);

  const previous =
    pastEntries.find((exercise) => exercise.workoutExerciseId === workoutExerciseId) ??
    pastEntries.find((exercise) => exercise.exerciseId === exerciseId);

  return (previous?.logged ?? []).map((set) => ({ reps: set.reps, weight: set.weight ?? undefined }));
};

export const start = async (workoutId: string, userId: string) => {
  const workout = await Workout.findOne({ _id: workoutId, owner: userId });
  if (!workout) throw new AppError("Workout not found", 404);

  // Only one workout can be in progress at a time
  const active = await getActive(userId);
  if (active) {
    if (active.workoutId.toString() === workoutId) return active;
    throw new AppError("Another workout is in progress. Finish or discard it first.", 409);
  }

  const entries = await getAllByWorkout(workoutId, userId);
  if (entries.length === 0) {
    throw new AppError("You need to add an exercise to this workout before starting it", 400);
  }

  const exercises = await Exercise.find({
    _id: { $in: entries.map((entry) => entry.exerciseId) },
    owner: userId,
  });

  const pastSessions = await Session.find({
    owner: userId,
    finishedAt: { $ne: null },
    "exercises.exerciseId": { $in: entries.map((entry) => entry.exerciseId) },
  })
    .sort({ finishedAt: -1 })
    .limit(LAST_SETS_SEARCH_LIMIT);

  return Session.create({
    workoutId,
    workoutName: workout.name,
    workoutNote: workout.note,
    restBetweenExercises: workout.restBetweenExercises,
    owner: userId,
    exercises: entries.map((entry) => {
      const exercise = exercises.find((item) => item._id.equals(entry.exerciseId));

      return {
        workoutExerciseId: entry._id,
        exerciseId: entry.exerciseId,
        name: exercise?.name ?? "Unknown exercise",
        note: exercise?.note,
        sets: entry.sets,
        restTime: entry.restTime,
        amrap: entry.amrap,
        noWeight: entry.noWeight,
        // Fields that don't apply to this entry aren't copied
        ...(entry.amrap ? {} : { minReps: entry.minReps, maxReps: entry.maxReps }),
        ...(entry.noWeight || entry.amrap ? {} : { weightIncrement: entry.weightIncrement }),
        lastSets: findLastSets(pastSessions, entry._id.toString(), entry.exerciseId.toString()),
        targetReps: entry.currentReps,
        ...(entry.noWeight ? {} : { targetWeight: entry.currentWeight }),
        loggedSets: Array.from({ length: entry.sets }, () => ({
          reps: entry.currentReps,
          ...(entry.noWeight ? {} : { weight: entry.currentWeight }),
          done: false,
        })),
      };
    }),
  });
};

// One page of finished workouts, newest first, optionally for just one workout
export const getFinished = async (userId: string, { workoutId, limit, before, after, until }: FinishedSessionsQuery) => {
  // before (paging) and until (the date range's end) are both upper limits, so the earlier one applies
  const upper = [before, until].filter((value) => value !== undefined).map((value) => new Date(value))
  const lessThan = upper.length > 0 ? new Date(Math.min(...upper.map((date) => date.getTime()))) : null

  // Asking for one extra shows whether there's another page
  const sessions = await Session.find({
    owner: userId,
    finishedAt: {
      $ne: null,
      ...(lessThan ? { $lt: lessThan } : {}),
      ...(after ? { $gte: new Date(after) } : {}),
    },
    ...(workoutId ? { workoutId } : {}),
  })
    .sort({ finishedAt: -1 })
    .limit(limit + 1);

  return { sessions: sessions.slice(0, limit), hasMore: sessions.length > limit };
};

// Numbers for the dashboard. weekStart comes from the browser, so "this week" follows the
// user's own time zone and first day of the week.
export const getStats = async (userId: string, weekStart: Date) => {
  const finished = { owner: userId, finishedAt: { $ne: null } };
  const [kept, thisWeek, last, user] = await Promise.all([
    Session.countDocuments(finished),
    Session.countDocuments({ owner: userId, finishedAt: { $ne: null, $gte: weekStart } }),
    Session.findOne(finished).sort({ finishedAt: -1 }).select("finishedAt"),
    User.findById(userId).select("removedSessions").lean(),
  ]);

  // The total includes workouts removed for being past the history limit
  const total = kept + (user?.removedSessions ?? 0);
  return { total, thisWeek, lastFinishedAt: last?.finishedAt ?? null };
};

export const getActive = async (userId: string) => {
  return Session.findOne({ owner: userId, finishedAt: null });
};

export const getById = async (id: string, userId: string) => {
  return Session.findOne({ _id: id, owner: userId });
};

export const logSet = async (id: string, userId: string, data: LogSetInput) => {
  const session = await getById(id, userId);
  if (!session) return null;
  if (session.finishedAt) throw new AppError("This workout is already finished", 409);

  const exercise = session.exercises[data.exerciseIndex];
  const set = exercise?.loggedSets[data.setIndex];
  if (!exercise || !set) throw new AppError("Set not found in this workout", 400);

  // Writes only this set, so ticking several quickly can't overwrite each other
  const path = `exercises.${data.exerciseIndex}.loggedSets.${data.setIndex}`;
  const updated = await Session.findOneAndUpdate(
    { _id: id, owner: userId, finishedAt: null },
    {
      $set: {
        [`${path}.reps`]: data.reps,
        [`${path}.done`]: data.done,
        ...(!exercise.noWeight && data.weight !== undefined ? { [`${path}.weight`]: data.weight } : {}),
      },
    },
    { returnDocument: "after" }
  );

  // It was finished or discarded after the check above
  if (!updated) throw new AppError("This workout is already finished", 409);

  return updated;
};

// Sets each exercise's current numbers (its target) from a finished session's logged sets.
// Exercises with nothing logged keep theirs, and an exercise since removed from the workout simply
// matches nothing.
const applyProgression = async (
  exercises: (ProgressionInput & { workoutExerciseId: mongoose.Types.ObjectId })[],
  userId: string
) => {
  const updates = exercises.flatMap((exercise) => {
    const next = nextCurrentNumbers(exercise);
    if (!next) return [];

    return [{
      updateOne: {
        filter: { _id: exercise.workoutExerciseId, owner: new mongoose.Types.ObjectId(userId) },
        update: { $set: next },
      },
    }];
  });

  if (updates.length > 0) {
    await WorkoutExercise.bulkWrite(updates);
  }
};

// Corrects the sets of a finished workout. If it's that workout's most recent finished session,
// the targets are worked out again from the corrected sets, as if it had been finished that way,
// so a typo like 210 kg instead of 21 kg doesn't stay in the plan. Older sessions only change
// History, the charts and "Last time".
export const editFinished = async (id: string, userId: string, data: EditFinishedSessionInput) => {
  const session = await Session.findOne({ _id: id, owner: userId, finishedAt: { $ne: null } });
  if (!session) return null;

  const sameShape = data.exercises.length === session.exercises.length &&
    data.exercises.every((exercise, index) => exercise.loggedSets.length === session.exercises[index].loggedSets.length);
  if (!sameShape) {
    throw new AppError("The sets don't match this workout. Reload and try again.", 400);
  }

  data.exercises.forEach((exercise, index) => {
    const noWeight = session.exercises[index].noWeight;
    session.set(`exercises.${index}.loggedSets`, exercise.loggedSets.map((set) => ({
      reps: set.reps,
      done: set.done,
      // A no-weight exercise never stores a weight, and a weighted one always does
      ...(noWeight ? {} : { weight: set.weight ?? 0 }),
    })));
  });
  await session.save();

  const latest = await Session.findOne({ owner: userId, workoutId: session.workoutId, finishedAt: { $ne: null } })
    .sort({ finishedAt: -1 })
    .select("_id")
    .lean();
  const targetsUpdated = !!latest && latest._id.equals(session._id);
  if (targetsUpdated) {
    await applyProgression(session.exercises, userId);
  }

  return { session, targetsUpdated };
};

export const finish = async (id: string, userId: string) => {
  // The new numbers are worked out from the logged sets rather than added on, so
  // applying them a second time gives the same result
  let session = await Session.findOneAndUpdate(
    { _id: id, owner: userId, finishedAt: null },
    { finishedAt: new Date(), progressionPending: true },
    { returnDocument: "after" }
  );

  if (!session) {
    session = await getById(id, userId);
    if (!session) return null;
    if (!session.progressionPending) {
      throw new AppError("This workout is already finished", 409);
    }
  }

  // Read before updating, so the summary can show how much each weight changed
  const entries = await WorkoutExercise.find({
    _id: { $in: session.exercises.map((exercise) => exercise.workoutExerciseId) },
    owner: userId,
  });

  const changes = session.exercises.map((exercise, exerciseIndex) => {
    const next = nextCurrentNumbers(exercise) as { currentWeight?: number; currentReps?: number } | null;
    const entry = entries.find((item) => item._id.equals(exercise.workoutExerciseId));
    const previousWeight = entry?.currentWeight;
    const weightChange = next?.currentWeight != null && previousWeight != null
      ? Math.round((next.currentWeight - previousWeight) * 100) / 100
      : 0;

    // Target reps before and after, so the summary can show progress for no-weight exercises,
    // where reps going up is the equivalent of more weight. Left out if the exercise is gone.
    const repsBefore = entry?.currentReps;
    const repsAfter = next?.currentReps ?? repsBefore;

    return { exerciseIndex, weightChange, repsBefore, repsAfter };
  });

  await applyProgression(session.exercises, userId);

  await advanceActive(session.workoutId, userId);

  session.progressionPending = false;
  await session.save();

  await removeOldSessions(userId);

  return { session, changes };
};

// Keeps only the newest MAX_SESSIONS_PER_USER finished workouts, deleting older ones. Runs after
// each finish, so it usually removes one at most. A workout in progress is never touched.
// It's tidying, so a failure is logged and the finished workout still counts.
const removeOldSessions = async (userId: string) => {
  try {
    const old = await Session.find({ owner: userId, finishedAt: { $ne: null } })
      .sort({ finishedAt: -1 })
      .skip(MAX_SESSIONS_PER_USER)
      .select("_id")
      .lean();
    if (old.length === 0) return;

    const { deletedCount } = await Session.deleteMany({ _id: { $in: old.map((s) => s._id) }, owner: userId });
    if (deletedCount > 0) {
      await User.updateOne({ _id: userId }, { $inc: { removedSessions: deletedCount } });
    }
  } catch (err) {
    console.error("Could not remove old sessions", err);
  }
};

export const deleteById = async (id: string, userId: string) => {
  return Session.findOneAndDelete({ _id: id, owner: userId });
};

type SessionDocument = InstanceType<typeof Session>;

// Sessions as sent to the browser, with each exercise's and the workout's current name in place
// of the name saved when the session started, so renaming one shows everywhere, History included.
// A deleted exercise or workout keeps the saved name. Only what's sent changes: the stored
// sessions keep their saved names, and their sets and plans stay as they were done.
export const withCurrentNames = async (sessions: SessionDocument[], userId: string) => {
  const plain = sessions.map((session) => session.toObject());
  const exerciseIds = [...new Set(plain.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId.toString())))];
  const workoutIds = [...new Set(plain.map((session) => session.workoutId.toString()))];

  const [exercises, workouts] = await Promise.all([
    Exercise.find({ _id: { $in: exerciseIds }, owner: userId }).select("name").lean(),
    Workout.find({ _id: { $in: workoutIds }, owner: userId }).select("name").lean(),
  ]);
  const exerciseNames = new Map(exercises.map((exercise) => [exercise._id.toString(), exercise.name]));
  const workoutNames = new Map(workouts.map((workout) => [workout._id.toString(), workout.name]));

  return plain.map((session) => ({
    ...session,
    workoutName: workoutNames.get(session.workoutId.toString()) ?? session.workoutName,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      name: exerciseNames.get(exercise.exerciseId.toString()) ?? exercise.name,
    })),
  }));
};

// The same for one session, or null
export const withCurrentName = async (session: SessionDocument | null, userId: string) =>
  session ? (await withCurrentNames([session], userId))[0] : null;

// Personal records: for each exercise in the given sessions, recordSetIndex is the set that beat
// everything logged for that exercise before it, by weight, or by reps for no-weight exercises.
// Only the session's best set is marked, and an exercise's very first session doesn't count,
// since there's nothing to beat yet. Worked out from all the user's finished sessions, so it's
// right however History is paged or filtered.
type NamedSession = Awaited<ReturnType<typeof withCurrentNames>>[number];

export const withRecords = async (sessions: NamedSession[], userId: string) => {
  const exerciseIds = [...new Set(sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId.toString())))];
  if (exerciseIds.length === 0) return sessions.map((session) => ({ ...session }));

  const history = await Session.find({
    owner: userId,
    finishedAt: { $ne: null },
    "exercises.exerciseId": { $in: exerciseIds },
  })
    .sort({ finishedAt: 1 })
    .select("finishedAt exercises.exerciseId exercises.noWeight exercises.loggedSets")
    .lean();

  // "<session id>:<exercise index>" -> the record set's index
  const records = new Map<string, number>();
  const bestSoFar = new Map<string, number>();
  for (const past of history) {
    past.exercises.forEach((exercise, exerciseIndex) => {
      const id = exercise.exerciseId.toString();
      if (!exerciseIds.includes(id)) return;
      const measure = (set: { reps: number; weight?: number | null }) => (exercise.noWeight ? set.reps : set.weight ?? 0);
      const done = exercise.loggedSets
        .map((set, setIndex) => ({ set, setIndex }))
        .filter(({ set }) => set.done && set.reps > 0);
      if (done.length === 0) return;

      const best = done.reduce((top, item) => (measure(item.set) > measure(top.set) ? item : top));
      const previous = bestSoFar.get(id);
      if (previous !== undefined && measure(best.set) > previous) {
        records.set(`${past._id.toString()}:${exerciseIndex}`, best.setIndex);
      }
      bestSoFar.set(id, Math.max(previous ?? -Infinity, measure(best.set)));
    });
  }

  return sessions.map((session) => ({
    ...session,
    exercises: session.exercises.map((exercise, exerciseIndex) => {
      const recordSetIndex = records.get(`${session._id.toString()}:${exerciseIndex}`);
      return recordSetIndex === undefined ? exercise : { ...exercise, recordSetIndex };
    }),
  }));
};

// Finished sessions as sent to the browser: current names and personal records
export const presentFinished = async (sessions: SessionDocument[], userId: string) =>
  withRecords(await withCurrentNames(sessions, userId), userId);
