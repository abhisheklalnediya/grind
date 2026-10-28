import { z } from "zod";
import {
  decimalLoadSchema,
  idSchema,
  repsSchema,
  setTypeSchema,
  timestampSchema,
  unitSchema,
  type SetType,
} from "./primitives";

export const previousSetSchema = z.object({
  set_type: setTypeSchema,
  ordinal: z.number().int().min(0),
  entered_load: decimalLoadSchema.nullable(),
  entered_unit: unitSchema,
  reps: repsSchema,
});
export const previousSchema = z
  .object({
    session_id: idSchema,
    finished_at: timestampSchema,
    sets: z.array(previousSetSchema),
  })
  .nullable();
export type PreviousPerformance = z.infer<typeof previousSchema>;
export function previousForSet(
  previous: PreviousPerformance,
  setType: SetType,
  ordinal: number,
) {
  if (previous === null) return null;
  return (
    previous.sets.find(
      (set) => set.set_type === setType && set.ordinal === ordinal,
    ) ?? null
  );
}
