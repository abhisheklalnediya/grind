import { loadSettings, settingsSchema } from "./grindAccount";
import { localTrainingTransport } from "./training/transport";
import { TrainingError } from "./training/errors";
export function scopedSettings(userId: string) {
  return {
    load: async () => {
      const settings = await loadSettings();
      if (settings.user_id !== userId) throw new TrainingError("auth");
      return settings;
    },
    save: async (unit: "kg" | "lb", seconds: number) => {
      const settings = settingsSchema.parse(
        await localTrainingTransport(userId).rpc("save_grind_settings", {
          p_preferred_unit: unit,
          p_default_rest_seconds: seconds,
        }),
      );
      if (settings.user_id !== userId) throw new TrainingError("auth");
      return settings;
    },
  };
}
