import { z } from "zod";
import {
  decimalLoadSchema,
  idSchema,
  loadModeSchema,
  nameSchema,
  notesSchema,
  positionSchema,
  repsSchema,
  restSchema,
  setTypeSchema,
  timestampSchema,
  unitSchema,
} from "./primitives";
import { isSetCompleteable } from "./loads";

export const setInputSchema = z
  .object({
    id: idSchema,
    position: positionSchema,
    set_type: setTypeSchema,
    entered_load: decimalLoadSchema.nullable(),
    entered_unit: unitSchema,
    reps: repsSchema.nullable(),
  })
  .strict();
export const trainingSetSchema = setInputSchema
  .extend({ completed_at: timestampSchema.nullable() })
  .strip();
const exerciseFields = {
  id: idSchema,
  exercise_id: idSchema,
  position: positionSchema,
  load_mode: loadModeSchema,
  notes: notesSchema,
  rest_seconds: restSchema,
};
function validateModeLoad(
  mode: z.infer<typeof loadModeSchema>,
  load: string | null,
  context: z.RefinementCtx,
  index: number,
) {
  if (mode === "bodyweight" && load !== null) {
    context.addIssue({
      code: "custom",
      path: ["sets", index, "entered_load"],
      message: "Bodyweight has no entered load.",
    });
  }
  if (mode === "assisted" && load !== null && Number(load) === 0) {
    context.addIssue({
      code: "custom",
      path: ["sets", index, "entered_load"],
      message: "Assistance must be positive.",
    });
  }
}
export const templateExerciseSchema = z
  .object({
    ...exerciseFields,
    sets: z.array(setInputSchema).max(100),
  })
  .strict()
  .superRefine((exercise, context) => {
    exercise.sets.forEach((set, index) =>
      validateModeLoad(exercise.load_mode, set.entered_load, context, index),
    );
  });
export const workoutExerciseSchema = z
  .object({
    ...exerciseFields,
    name: nameSchema,
    load_convention: nameSchema,
    sets: z.array(trainingSetSchema).max(100),
  })
  .superRefine((exercise, context) => {
    exercise.sets.forEach((set, index) => {
      validateModeLoad(exercise.load_mode, set.entered_load, context, index);
      if (
        set.completed_at !== null &&
        !isSetCompleteable(set, exercise.load_mode)
      ) {
        context.addIssue({
          code: "custom",
          path: ["sets", index],
          message: "A completed set must have valid values.",
        });
      }
    });
  });
export const sessionSchema = z.object({
  id: idSchema,
  status: z.enum(["active", "completed", "cancelled"]),
  name: nameSchema,
  started_at: timestampSchema,
  finished_at: timestampSchema.nullable(),
  timezone: z.string().min(1).max(100),
  revision: z.number().int().min(0),
  source_routine_id: idSchema.nullable(),
  exercises: z.array(workoutExerciseSchema).max(100),
});
export const routinePayloadSchema = z
  .object({
    name: nameSchema,
    exercises: z.array(templateExerciseSchema).max(100),
  })
  .strict();
export const routineSchema = routinePayloadSchema
  .extend({
    id: idSchema,
    version: z.number().int().min(1),
    archived_at: timestampSchema.nullable(),
  })
  .strip();
export const customExercisePayloadSchema = z
  .object({
    name: nameSchema,
    primary_muscle: z.string().trim().min(1).max(40),
    equipment: z.string().trim().min(1).max(40),
    category: z.string().trim().min(1).max(40),
    load_convention: nameSchema,
    load_mode: loadModeSchema,
  })
  .strict();
export const exerciseSchema = customExercisePayloadSchema
  .extend({
    id: idSchema,
    origin: z.enum(["grind", "custom", "provider"]),
    owner_id: idSchema.nullable(),
    archived_at: timestampSchema.nullable(),
    created_at: timestampSchema,
  })
  .strip()
  .refine(
    (exercise) =>
      (exercise.origin === "custom") === (exercise.owner_id !== null),
    "Only custom exercises have an owner.",
  );
const cursorSchema = z.object({ finished_at: timestampSchema, id: idSchema });
export const historyPageSchema = z.object({
  items: z.array(sessionSchema),
  next_cursor: cursorSchema.nullable(),
});
export type TrainingSession = z.infer<typeof sessionSchema>;
export type TrainingRoutine = z.infer<typeof routineSchema>;
export type TrainingExercise = z.infer<typeof exerciseSchema>;
export type TrainingSet = z.infer<typeof trainingSetSchema>;
export type RoutinePayload = z.infer<typeof routinePayloadSchema>;
export type CustomExercisePayload = z.infer<typeof customExercisePayloadSchema>;
