import { z } from "zod";
import { getSupabase } from "./supabase";
const accountSchema = z.object({
  user_id: z.uuid(),
  created_at: z.string(),
  setup_completed_at: z.string().nullable(),
});
export const settingsSchema = z.object({
  user_id: z.uuid(),
  preferred_unit: z.enum(["kg", "lb"]),
  default_rest_seconds: z.number().int().min(15).max(3600),
  updated_at: z.string(),
});
export type GrindSettings = z.infer<typeof settingsSchema>;
export async function joinGrind() {
  const { data, error } = await getSupabase().schema("grind").rpc("join_grind");
  if (error) throw error;
  return accountSchema.parse(data);
}
export async function loadSettings() {
  const { data, error } = await getSupabase()
    .schema("grind")
    .from("user_settings")
    .select("user_id, preferred_unit, default_rest_seconds, updated_at")
    .single();
  if (error) throw error;
  return settingsSchema.parse(data);
}
export async function saveSettings(
  unit: "kg" | "lb",
  seconds: number,
  setup = false,
) {
  const { data, error } = await getSupabase()
    .schema("grind")
    .rpc(setup ? "complete_grind_setup" : "save_grind_settings", {
      p_preferred_unit: unit,
      p_default_rest_seconds: seconds,
    });
  if (error) throw error;
  return settingsSchema.parse(data);
}
