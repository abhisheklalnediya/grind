import type {
  ConfiguredExercise,
  TrainingRoutine,
  TrainingSession,
  TrainingSet,
} from "@/domain/training";
export const trainingId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const trainingTime = "2026-10-27T12:00:00.000Z";
export function makeSet(): TrainingSet {
  return {
    id: trainingId(3),
    position: 0,
    set_type: "working",
    entered_load: "60",
    entered_unit: "kg",
    reps: 8,
    completed_at: null,
  };
}
export function makeSession(): TrainingSession {
  return {
    id: trainingId(1),
    status: "active",
    name: "Workout",
    started_at: trainingTime,
    finished_at: null,
    timezone: "UTC",
    revision: 0,
    source_routine_id: null,
    exercises: [],
  };
}
export function makeCatalogExercise(): ConfiguredExercise {
  return {
    id: trainingId(2),
    origin: "grind",
    owner_id: null,
    name: "Bench press",
    primary_muscle: "Chest",
    equipment: "Barbell",
    category: "Strength",
    load_convention: "Total barbell weight",
    load_mode: "external",
    archived_at: null,
    created_at: trainingTime,
  };
}
export function makeRoutine(): TrainingRoutine {
  return {
    id: trainingId(4),
    name: "Push day",
    version: 1,
    archived_at: null,
    exercises: [],
  };
}
