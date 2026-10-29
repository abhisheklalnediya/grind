import { z } from "zod";
import type { ImageSourcePropType } from "react-native";
import source from "repdb-archive";
import images from "repdb-images";

const recordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  instructions: z.array(z.string()),
  primary_muscles: z.array(z.string()),
  secondary_muscles: z.array(z.string()).default([]),
  equipment: z.string().optional(),
  is_bodyweight: z.boolean().optional(),
  synonyms: z.array(z.string()).default([]),
});
const archiveSchema = z.object({
  schema_version: z.literal(3),
  exercises: z.array(recordSchema).min(1),
});
export type BundledExercise = {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  synonyms: string[];
};
export type ExerciseFilters = {
  query: string;
  muscle: string;
  equipment: string;
};

export function readBundledCatalog(input: unknown): BundledExercise[] | null {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return null;
  const seen = new Set<string>();
  const result: BundledExercise[] = [];
  for (const row of parsed.data.exercises) {
    if (seen.has(row.id)) return null;
    seen.add(row.id);
    result.push({
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      primaryMuscles: row.primary_muscles,
      secondaryMuscles: row.secondary_muscles,
      equipment:
        row.equipment ?? (row.is_bodyweight ? "bodyweight" : "unspecified"),
      synonyms: row.synonyms,
    });
  }
  return result;
}
const parsed = readBundledCatalog(source);
export const catalogAvailable = parsed !== null;
export const bundledExercises = parsed ?? [];
const normalize = (value: string) =>
  value.trim().toLowerCase().replaceAll("_", " ");
export function searchBundledExercises(
  items: BundledExercise[],
  filters: ExerciseFilters,
): BundledExercise[] {
  const query = normalize(filters.query);
  const muscle = normalize(filters.muscle);
  const equipment = normalize(filters.equipment);
  return items
    .filter(
      (item) =>
        [item.name, ...item.synonyms].some((value) =>
          normalize(value).includes(query),
        ) &&
        (!muscle ||
          [...item.primaryMuscles, ...item.secondaryMuscles].some((value) =>
            normalize(value).includes(muscle),
          )) &&
        (!equipment || normalize(item.equipment).includes(equipment)),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export function exerciseImage(id: string): ImageSourcePropType | undefined {
  return images[id];
}
