import { useQuery } from "@tanstack/react-query";
import type { SetType } from "@/domain/training";
import { useTheme } from "@/theme/useTheme";
import { useTraining } from "@/features/training";

const legacyTypes: SetType[] = ["warmup", "working"];
export function useSupportedSetTypes(): SetType[] {
  const { api } = useTraining();
  const { scope } = useTheme();
  const query = useQuery({
    queryKey: ["supported-set-types", scope],
    queryFn: async () => {
      if (!api || typeof api.supportedSetTypes !== "function")
        return legacyTypes;
      try {
        const types = await api.supportedSetTypes();
        return types.includes("warmup") && types.includes("working")
          ? types.filter((type) => type !== "rest_pause")
          : legacyTypes;
      } catch {
        return legacyTypes;
      }
    },
    enabled: Boolean(api),
    staleTime: 60_000,
  });
  return query.data ?? legacyTypes;
}
