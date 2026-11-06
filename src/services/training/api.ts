import { z } from "zod";
import {
  customExercisePayloadSchema,
  exerciseSchema,
  historyPageSchema,
  previousSchema,
  routinePayloadSchema,
  routineSchema,
  sessionSchema,
  setTypeSchema,
  workoutCommandSchema,
  type CustomExercisePayload,
  type LoadMode,
  type TrackingType,
  type RoutinePayload,
  type WorkoutCommand,
} from "@/domain/training";
import { TrainingError } from "./errors";
import {
  localTrainingTransport,
  type RpcName,
  type RpcParameters,
  type TrainingTransport,
} from "./transport";
export function createTrainingApi(transport: TrainingTransport) {
  const rpc = async <T>(
    name: RpcName,
    parameters: RpcParameters,
    schema: z.ZodType<T>,
  ): Promise<T> => {
    const result = schema.safeParse(await transport.rpc(name, parameters));
    if (!result.success) throw new TrainingError("response");
    return result.data;
  };
  return {
    start: (operation: string, routine: string | null, timezone: string) =>
      rpc(
        "start_workout",
        {
          p_operation_id: operation,
          p_routine_id: routine,
          p_timezone: timezone,
        },
        sessionSchema,
      ),
    active: () => rpc("get_active_workout", {}, sessionSchema.nullable()),
    workout: (id: string) =>
      rpc("get_workout", { p_session_id: id }, sessionSchema),
    apply: (
      operation: string,
      id: string,
      revision: number,
      command: WorkoutCommand,
    ) =>
      rpc(
        "apply_workout_command",
        {
          p_operation_id: operation,
          p_session_id: id,
          p_expected_revision: revision,
          p_command: workoutCommandSchema.parse(command),
        },
        sessionSchema,
      ),
    finish: (operation: string, id: string, revision: number) =>
      rpc(
        "finish_workout",
        {
          p_operation_id: operation,
          p_session_id: id,
          p_expected_revision: revision,
        },
        sessionSchema,
      ),
    cancel: (operation: string, id: string, revision: number) =>
      rpc(
        "cancel_workout",
        {
          p_operation_id: operation,
          p_session_id: id,
          p_expected_revision: revision,
        },
        sessionSchema,
      ),
    history: (cursor: { finished_at: string; id: string } | null = null) =>
      rpc(
        "list_workout_history",
        {
          p_before_finished_at: cursor?.finished_at ?? null,
          p_before_id: cursor?.id ?? null,
          p_limit: 30,
        },
        historyPageSchema,
      ),
    routines: () => rpc("list_routines", {}, z.array(routineSchema)),
    routine: (id: string) =>
      rpc("get_routine", { p_routine_id: id }, routineSchema),
    saveRoutine: (
      operation: string,
      id: string | null,
      version: number | null,
      template: RoutinePayload,
    ) =>
      rpc(
        "save_routine",
        {
          p_operation_id: operation,
          p_routine_id: id,
          p_expected_version: version,
          p_template: routinePayloadSchema.parse(template),
        },
        routineSchema,
      ),
    archiveRoutine: (operation: string, id: string, version: number) =>
      rpc(
        "archive_routine",
        {
          p_operation_id: operation,
          p_routine_id: id,
          p_expected_version: version,
        },
        routineSchema,
      ),
    saveExercise: (
      operation: string,
      id: string | null,
      payload: CustomExercisePayload,
    ) =>
      rpc(
        "save_custom_exercise",
        {
          p_operation_id: operation,
          p_exercise_id: id,
          p_payload: customExercisePayloadSchema.parse(payload),
        },
        exerciseSchema,
      ),
    archiveExercise: (operation: string, id: string) =>
      rpc(
        "archive_custom_exercise",
        { p_operation_id: operation, p_exercise_id: id },
        exerciseSchema,
      ),
    previous: (
      exercise: string,
      mode: LoadMode,
      convention?: string,
      trackingType?: TrackingType,
    ) =>
      rpc(
        "get_previous_performance",
        {
          p_exercise_id: exercise,
          p_load_mode: mode,
          p_load_convention: convention ?? null,
          ...(trackingType ? { p_tracking_type: trackingType } : {}),
        },
        previousSchema,
      ),
    supportedSetTypes: () =>
      rpc<{ set_types: z.infer<typeof setTypeSchema>[] }>(
        "get_supported_set_types",
        {},
        z
          .object({
            set_types: z.array(setTypeSchema).max(5).refine(
              (setTypes) => new Set(setTypes).size === setTypes.length,
              "Supported set types must be unique.",
            ),
          })
          .strict(),
      ).then((result) => result.set_types),
    searchCatalog: (input: {
      query: string;
      muscle?: string;
      equipment?: string;
      custom?: boolean;
      after?: { name: string; id: string };
      limit?: number;
    }) => {
      const parsed = z
        .object({
          query: z.string().max(100),
          muscle: z.string().max(100).optional(),
          equipment: z.string().max(100).optional(),
          custom: z.boolean().optional(),
          after: z
            .object({ name: z.string().max(200), id: z.string().uuid() })
            .optional(),
          limit: z.number().int().min(1).max(50).optional(),
        })
        .strict()
        .parse(input);
      return rpc(
        "search_catalog",
        {
          p_query: parsed.query.trim(),
          p_muscle: parsed.muscle?.trim() || null,
          p_equipment: parsed.equipment?.trim() || null,
          p_after_name: parsed.after?.name ?? null,
          p_after_id: parsed.after?.id ?? null,
          p_limit: parsed.limit ?? 30,
          p_custom: parsed.custom ?? false,
        },
        z.array(exerciseSchema),
      );
    },
    catalog: async () => {
      const result = z
        .array(exerciseSchema)
        .safeParse(await transport.catalog());
      if (!result.success) throw new TrainingError("response");
      return result.data;
    },
  };
}
export type TrainingApi = ReturnType<typeof createTrainingApi>;
export function trainingApi(expectedUserId: string): TrainingApi {
  return createTrainingApi(localTrainingTransport(expectedUserId));
}
