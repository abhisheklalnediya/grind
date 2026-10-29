import { z } from "zod";
import { readEnvironment, type PublicEnvironment } from "../environment";
import { getSupabase } from "../supabase";
import { TrainingError, trainingFailure } from "./errors";
export type RpcName =
  | "search_catalog"
  | "save_grind_settings"
  | "start_workout"
  | "apply_workout_command"
  | "finish_workout"
  | "cancel_workout"
  | "get_active_workout"
  | "get_workout"
  | "list_workout_history"
  | "save_routine"
  | "archive_routine"
  | "list_routines"
  | "get_routine"
  | "save_custom_exercise"
  | "archive_custom_exercise"
  | "get_previous_performance";
export type RpcParameters = Record<string, unknown>;
export interface TrainingTransport {
  rpc(name: RpcName, parameters: RpcParameters): Promise<unknown>;
  catalog(): Promise<unknown>;
}
const errorSchema = z.object({ code: z.string().optional() });
type Dependencies = {
  environment: PublicEnvironment;
  token: () => Promise<string | null>;
  fetch: typeof fetch;
};
export function createTrainingTransport(
  dependencies: Dependencies,
): TrainingTransport {
  const request = async (
    path: string,
    parameters?: RpcParameters,
  ): Promise<unknown> => {
    const token = await dependencies.token();
    if (!token) throw new TrainingError("auth");
    let response: Response;
    try {
      response = await dependencies.fetch(
        `${new URL(dependencies.environment.url).origin}/rest/v1/${path}`,
        {
          method: parameters === undefined ? "GET" : "POST",
          headers: {
            apikey: dependencies.environment.key,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept-Profile": "grind",
            "Content-Profile": "grind",
          },
          ...(parameters === undefined
            ? {}
            : { body: JSON.stringify(parameters) }),
        },
      );
    } catch {
      throw new TrainingError("network");
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new TrainingError("response");
    }
    if (!response.ok) {
      const error = errorSchema.safeParse(data);
      throw trainingFailure(
        response.status,
        error.success ? error.data.code : undefined,
      );
    }
    return data;
  };
  return {
    rpc: (name, parameters) => request(`rpc/${name}`, parameters),
    catalog: () =>
      request("exercises?select=*&archived_at=is.null&order=name.asc,id.asc"),
  };
}
export function localTrainingTransport(
  expectedUserId: string,
): TrainingTransport {
  const environment = readEnvironment();
  if (!environment) throw new TrainingError("auth");
  return createTrainingTransport({
    environment,
    fetch: (...args) => fetch(...args),
    token: async () => {
      const { data, error } = await getSupabase().auth.getSession();
      if (error || !data.session || data.session.user.id !== expectedUserId)
        throw new TrainingError("auth");
      return data.session.access_token;
    },
  });
}
