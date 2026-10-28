import { z } from "zod";
import {
  exerciseSchema,
  sessionSchema,
  workoutCommandSchema,
  isSetCompleteable,
  type TrainingSession,
  type WorkoutCommand,
} from "@/domain/training";
const envelope = {
  operation_id: z.uuid(),
  session_id: z.uuid(),
  expected_revision: z.number().int().min(0),
};
export const queuedMutationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("command"),
    ...envelope,
    command: workoutCommandSchema,
    catalog: exerciseSchema.optional(),
  }),
  z.object({ kind: z.literal("finish"), ...envelope }),
  z.object({ kind: z.literal("cancel"), ...envelope }),
]);
export const draftSchema = z
  .object({
    version: z.literal(1),
    session: sessionSchema.nullable(),
    pending: z.array(queuedMutationSchema).max(1000),
    raw: z.record(z.string(), z.string().max(2000)),
    timer: z
      .object({
        ends_at: z.number().finite(),
        exercise_id: z.uuid(),
        set_id: z.uuid(),
      })
      .nullable(),
    start: z
      .object({
        operation_id: z.uuid(),
        routine_id: z.uuid().nullable(),
        timezone: z.string(),
      })
      .nullable(),
  })
  .superRefine((draft, context) => {
    if (
      draft.pending.some((item) => item.session_id !== draft.session?.id) ||
      new Set(draft.pending.map((item) => item.operation_id)).size !==
        draft.pending.length ||
      Object.keys(draft.raw).length > 10000
    )
      context.addIssue({ code: "custom", message: "Invalid scoped draft." });
  });
export type DraftDocument = z.infer<typeof draftSchema>;
export type QueuedMutation = z.infer<typeof queuedMutationSchema>;
export type OutboxStatus =
  | "loading"
  | "saved"
  | "saving"
  | "error"
  | "conflict";
export interface DraftStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export const emptyDraft = (): DraftDocument => ({
  version: 1,
  session: null,
  pending: [],
  raw: {},
  timer: null,
  start: null,
});
export const rawFieldKey = (
  exercise: string,
  set: string,
  field: "load" | "reps",
) => `${exercise}:${set}:${field}`;
export function canFinish(session: TrainingSession | null): boolean {
  return (
    session !== null &&
    session.status === "active" &&
    session.exercises.length > 0 &&
    session.exercises.every(
      (exercise) =>
        exercise.sets.length > 0 &&
        exercise.sets.every(
          (set) =>
            set.completed_at !== null &&
            isSetCompleteable(set, exercise.load_mode),
        ),
    )
  );
}
export function clearCommandRaw(
  raw: Record<string, string>,
  command: WorkoutCommand,
) {
  if (command.type === "rename_workout")
    return Object.fromEntries(
      Object.entries(raw).filter(([key]) => !key.startsWith("workout:")),
    );
  if (command.type === "update_exercise")
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([key]) =>
          key !== `${command.exercise_id}:notes` &&
          key !== `${command.exercise_id}:rest`,
      ),
    );
  if (
    command.type !== "upsert_set" &&
    command.type !== "remove_set" &&
    command.type !== "remove_exercise"
  )
    return raw;
  const prefix =
    command.type === "remove_exercise"
      ? `${command.exercise_id}:`
      : `${command.exercise_id}:${command.type === "upsert_set" ? command.set.id : command.set_id}:`;
  return Object.fromEntries(
    Object.entries(raw).filter(([key]) => !key.startsWith(prefix)),
  );
}
export function commandTimer(
  draft: DraftDocument,
  command: WorkoutCommand,
  now: number,
): DraftDocument["timer"] {
  if (command.type === "complete_set" && command.completed) {
    const exercise = draft.session?.exercises.find(
      (item) => item.id === command.exercise_id,
    );
    if (exercise)
      return {
        ends_at: now + exercise.rest_seconds * 1000,
        exercise_id: command.exercise_id,
        set_id: command.set_id,
      };
  }
  if (!draft.timer) return null;
  if (
    command.type === "remove_exercise" &&
    command.exercise_id === draft.timer.exercise_id
  )
    return null;
  if (
    (command.type === "remove_set" ||
      command.type === "upsert_set" ||
      command.type === "complete_set") &&
    command.exercise_id === draft.timer.exercise_id &&
    (command.type === "upsert_set" ? command.set.id : command.set_id) ===
      draft.timer.set_id
  )
    return null;
  return draft.timer;
}
