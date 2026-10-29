import {
  isConfiguredExercise,
  type TrainingExercise,
  type TrainingSession,
  type WorkoutCommand,
} from "@/domain/training";
import { TrainingError } from "./errors";
export type ProjectedCommand = {
  command: WorkoutCommand;
  catalog?: TrainingExercise | undefined;
};
const compact = <T extends { position: number }>(items: T[]) =>
  items.map((item, position) => ({ ...item, position }));
function ordered<T extends { id: string; position: number }>(
  items: T[],
  ids: string[],
) {
  if (
    ids.length !== items.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !items.some((item) => item.id === id))
  )
    throw new TrainingError("validation");
  return ids.map((id, position) => {
    const item = items.find((candidate) => candidate.id === id);
    return { ...item, position } as T;
  });
}
// Editing projection only. Server validation/revisions remain authoritative.
export function projectCommand(
  session: TrainingSession,
  entry: ProjectedCommand,
  now: number,
): TrainingSession {
  const command = entry.command;
  if (command.type === "rename_workout")
    return { ...session, name: command.name };
  if (command.type === "add_exercise") {
    if (session.exercises.some((exercise) => exercise.id === command.id))
      return session;
    if (entry.catalog && !isConfiguredExercise(entry.catalog))
      throw new TrainingError("validation");
    const exercise = {
      id: command.id,
      exercise_id: command.exercise_id,
      position: command.position,
      name: entry.catalog?.name ?? "Exercise",
      load_convention: entry.catalog?.load_convention ?? "Unspecified",
      load_mode: command.load_mode,
      tracking_type: command.tracking_type ?? entry.catalog?.tracking_type ?? undefined,
      notes: command.notes,
      rest_seconds: command.rest_seconds,
      sets: [],
    };
    const exercises = [...session.exercises];
    exercises.splice(command.position, 0, exercise);
    return { ...session, exercises: compact(exercises) };
  }
  if (command.type === "remove_exercise")
    return {
      ...session,
      exercises: compact(
        session.exercises.filter(
          (exercise) => exercise.id !== command.exercise_id,
        ),
      ),
    };
  if (command.type === "reorder_exercises")
    return { ...session, exercises: ordered(session.exercises, command.ids) };
  let found = false;
  const exercises = session.exercises.map((exercise) => {
    if (exercise.id !== command.exercise_id) return exercise;
    found = true;
    if (command.type === "update_exercise")
      return {
        ...exercise,
        notes: command.notes,
        rest_seconds: command.rest_seconds,
      };
    if (command.type === "remove_set")
      return {
        ...exercise,
        sets: compact(exercise.sets.filter((set) => set.id !== command.set_id)),
      };
    if (command.type === "reorder_sets")
      return { ...exercise, sets: ordered(exercise.sets, command.ids) };
    if (command.type === "upsert_set") {
      const existing = exercise.sets.find((set) => set.id === command.set.id);
      const unchanged =
        existing &&
        existing.entered_load === command.set.entered_load &&
        existing.entered_unit === command.set.entered_unit &&
        existing.reps === command.set.reps &&
        (existing.duration_seconds ?? null) ===
          (command.set.duration_seconds ?? null) &&
        (existing.entered_distance ?? null) ===
          (command.set.entered_distance ?? null) &&
        (existing.distance_unit ?? null) ===
          (command.set.distance_unit ?? null) &&
        existing.set_type === command.set.set_type;
      const set = {
        ...command.set,
        completed_at: unchanged ? existing.completed_at : null,
      };
      const sets = exercise.sets.filter((item) => item.id !== command.set.id);
      sets.splice(command.set.position, 0, set);
      return { ...exercise, sets: compact(sets) };
    }
    let setFound = false;
    const sets = exercise.sets.map((set) => {
      if (set.id !== command.set_id) return set;
      setFound = true;
      return {
        ...set,
        completed_at: command.completed ? new Date(now).toISOString() : null,
      };
    });
    if (!setFound) throw new TrainingError("validation");
    return { ...exercise, sets };
  });
  if (!found) throw new TrainingError("validation");
  return { ...session, exercises };
}
export function projectPending(
  session: TrainingSession | null,
  entries: ProjectedCommand[],
  now: number,
): TrainingSession | null {
  return session === null
    ? null
    : entries.reduce(
        (result, entry) => projectCommand(result, entry, now),
        session,
      );
}
