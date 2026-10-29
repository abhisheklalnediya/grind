import { z } from "zod";
import {
  idSchema,
  loadModeSchema,
  nameSchema,
  notesSchema,
  positionSchema,
  restSchema,
  trackingTypeSchema,
} from "./primitives";
import { setInputSchema } from "./schemas";

const idsSchema = z
  .array(idSchema)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "IDs must be unique.");
export const workoutCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rename_workout"), name: nameSchema }).strict(),
  z
    .object({
      type: z.literal("add_exercise"),
      id: idSchema,
      exercise_id: idSchema,
      position: positionSchema,
      load_mode: loadModeSchema,
      tracking_type: trackingTypeSchema.optional(),
      notes: notesSchema,
      rest_seconds: restSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("update_exercise"),
      exercise_id: idSchema,
      notes: notesSchema,
      rest_seconds: restSchema,
    })
    .strict(),
  z
    .object({ type: z.literal("remove_exercise"), exercise_id: idSchema })
    .strict(),
  z.object({ type: z.literal("reorder_exercises"), ids: idsSchema }).strict(),
  z
    .object({
      type: z.literal("upsert_set"),
      exercise_id: idSchema,
      set: setInputSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("remove_set"),
      exercise_id: idSchema,
      set_id: idSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("reorder_sets"),
      exercise_id: idSchema,
      ids: idsSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("complete_set"),
      exercise_id: idSchema,
      set_id: idSchema,
      completed: z.boolean(),
    })
    .strict(),
]);
export type WorkoutCommand = z.infer<typeof workoutCommandSchema>;
