import { z } from "zod";
import { readEnvironment, type PublicEnvironment } from "../environment";
import { getSupabase } from "../supabase";
import { TrainingError, trainingFailure } from "./errors";
export type RpcName =
  | "search_catalog"
  | "catalog_with_sources"
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
  | "get_previous_performance"
  | "get_supported_set_types";
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
    parameters: RpcParameters,
  ): Promise<unknown> => {
    const token = await dependencies.token();
    if (!token) throw new TrainingError("auth");
    let response: Response;
    try {
      response = await dependencies.fetch(
        `${new URL(dependencies.environment.url).origin}/rest/v1/${path}`,
        {
          method: "POST",
          headers: {
            apikey: dependencies.environment.key,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept-Profile": "grind",
            "Content-Profile": "grind",
          },
          body: JSON.stringify(parameters),
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
    catalog: async () => {
      const pageSchema = z
        .array(
          z.object({ id: z.uuid(), name: z.string().min(1) }).passthrough(),
        )
        .max(100);
      const result: unknown[] = [];
      const seen = new Set<string>();
      let afterName: string | null = null;
      let afterId: string | null = null;
      for (let page = 0; page < 100; page++) {
        const parsed = pageSchema.safeParse(
          await request("rpc/catalog_with_sources", {
            p_after_name: afterName,
            p_after_id: afterId,
            p_limit: 100,
          }),
        );
        if (!parsed.success) throw new TrainingError("response");
        for (const item of parsed.data) {
          if (seen.has(item.id)) throw new TrainingError("response");
          seen.add(item.id);
          result.push(item);
          afterName = item.name;
          afterId = item.id;
        }
        if (parsed.data.length < 100) return result;
      }
      throw new TrainingError("response");
    },
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
