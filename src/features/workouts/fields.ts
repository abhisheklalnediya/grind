import {
  parseLoadInput,
  type LoadMode,
  type TrainingSet,
} from "@/domain/training";
export function editedSet(
  set: TrainingSet,
  mode: LoadMode,
  load: string,
  reps: string,
) {
  const parsed = parseLoadInput(load, mode);
  if (load !== "" && parsed.status !== "valid") return null;
  if (
    reps !== "" &&
    (!/^\d+$/.test(reps) || Number(reps) < 1 || Number(reps) > 10000)
  )
    return null;
  return {
    id: set.id,
    position: set.position,
    set_type: set.set_type,
    entered_load: parsed.status === "valid" ? parsed.value : null,
    entered_unit: set.entered_unit,
    reps: reps === "" ? null : Number(reps),
  };
}
export function moved(ids: string[], index: number, direction: number) {
  const result = [...ids];
  const target = index + direction;
  if (target < 0 || target >= ids.length) return result;
  const current = result[index];
  const next = result[target];
  if (current !== undefined && next !== undefined) {
    result[index] = next;
    result[target] = current;
  }
  return result;
}
