import {
  isConfiguredExercise,
  type TrainingExercise,
} from "@/domain/training";
import {
  searchBundledExercises,
  type BundledExercise,
  type ExerciseFilters,
} from "@/services/exercises";
import { filterCatalog } from "./catalog";

// Explicit source links alone join the two representations: names are not identities.
type LinkedExercise = TrainingExercise & {
  source_key?: string | null | undefined;
  source_exercise_id?: string | null | undefined;
};
export type CatalogItem =
  | {
      kind: "repdb";
      exercise: BundledExercise;
      server?: LinkedExercise | undefined;
    }
  | { kind: "server"; exercise: LinkedExercise };

export function catalogItems(
  local: BundledExercise[],
  server: LinkedExercise[],
  filters: ExerciseFilters,
  mine: boolean,
): CatalogItem[] {
  const active = server.filter(
    (item) => !item.archived_at && isConfiguredExercise(item),
  );
  const linked = new Map<string, LinkedExercise>();
  for (const item of active) {
    if (
      item.origin !== "custom" &&
      item.source_key === "repdb" &&
      item.source_exercise_id
    )
      linked.set(item.source_exercise_id, item);
  }
  const localIds = new Set(local.map((item) => item.id));
  const matchingLocal = mine
    ? []
    : searchBundledExercises(local, filters).filter((item) =>
        linked.has(item.id),
      );
  const matchingServer = filterCatalog(
    active,
    filters.query,
    filters.muscle,
    filters.equipment,
    mine,
  );
  const matchingServerIds = new Set(matchingServer.map((item) => item.id));
  const result: CatalogItem[] = matchingLocal.map((exercise) => ({
    kind: "repdb",
    exercise,
    server: linked.get(exercise.id),
  }));
  // A mapped server match may use a different reviewed label from the local data.
  if (!mine)
    for (const exercise of local) {
      const mapped = linked.get(exercise.id);
      if (
        mapped &&
        matchingServerIds.has(mapped.id) &&
        !matchingLocal.includes(exercise)
      )
        result.push({ kind: "repdb", exercise, server: mapped });
    }
  for (const exercise of matchingServer) {
    const mappedLocal =
      exercise.source_key === "repdb" &&
      exercise.source_exercise_id &&
      localIds.has(exercise.source_exercise_id) &&
      linked.get(exercise.source_exercise_id)?.id === exercise.id;
    if (!mappedLocal || mine) result.push({ kind: "server", exercise });
  }
  return result.sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
}
