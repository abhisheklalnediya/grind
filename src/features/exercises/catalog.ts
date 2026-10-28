import { useQuery } from "@tanstack/react-query";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import type { LoadMode, TrainingExercise } from "@/domain/training";
export const loadModes: Record<LoadMode, string> = {
  external: "Regular weights",
  bodyweight: "Bodyweight",
  assisted: "Assisted",
  weighted_bodyweight: "Weighted bodyweight",
};
export function filterCatalog(
  items: TrainingExercise[],
  search: string,
  muscle: string,
  equipment: string,
  custom: boolean,
) {
  return items
    .filter(
      (item) =>
        !item.archived_at &&
        item.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (!muscle ||
          item.primary_muscle
            .toLowerCase()
            .includes(muscle.trim().toLowerCase())) &&
        (!equipment ||
          item.equipment
            .toLowerCase()
            .includes(equipment.trim().toLowerCase())) &&
        (!custom || item.origin === "custom"),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}
export function useCatalog() {
  const { api } = useTraining();
  const { scope } = useTheme();
  return useQuery({
    queryKey: ["catalog", scope],
    queryFn: () => {
      if (!api) throw new Error("Sign in to view exercises.");
      return api.catalog();
    },
    enabled: api !== null,
  });
}
