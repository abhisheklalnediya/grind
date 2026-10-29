import { create } from "zustand";
import { randomUUID } from "expo-crypto";
import type {
  RoutinePayload,
  TrainingExercise,
  TrainingRoutine,
} from "@/domain/training";
import { isConfiguredExercise } from "@/domain/training";
export type RoutineDraft = {
  scope: string;
  id: string | null;
  version: number | null;
  payload: RoutinePayload;
  dirty: boolean;
};
interface DraftStore {
  draft: RoutineDraft | null;
  begin: (scope: string, routine?: TrainingRoutine) => void;
  update: (payload: RoutinePayload) => void;
  add: (
    scope: string,
    exercises: TrainingExercise[],
    restSeconds?: number,
  ) => void;
  reviewVersion: (version: number) => void;
  clear: () => void;
}
export const useRoutineDraft = create<DraftStore>((set) => ({
  draft: null,
  begin: (scope, routine) =>
    set((state) =>
      state.draft?.scope === scope && state.draft.id === (routine?.id ?? null)
        ? state
        : {
            draft: {
              scope,
              id: routine?.id ?? null,
              version: routine?.version ?? null,
              payload: {
                name: routine?.name ?? "",
                exercises: routine?.exercises ?? [],
              },
              dirty: false,
            },
          },
    ),
  update: (payload) =>
    set((state) =>
      state.draft ? { draft: { ...state.draft, payload, dirty: true } } : state,
    ),
  add: (scope, exercises, restSeconds = 120) =>
    set((state) => {
      if (!state.draft || state.draft.scope !== scope) return state;
      const configured = exercises.filter(isConfiguredExercise);
      if (configured.length !== exercises.length)
        throw new Error("This exercise is not yet available for workouts.");
      const old = state.draft.payload.exercises;
      return {
        draft: {
          ...state.draft,
          dirty: true,
          payload: {
            ...state.draft.payload,
            exercises: [
              ...old,
              ...configured.map((exercise, index) => ({
                id: randomUUID(),
                exercise_id: exercise.id,
                position: old.length + index,
                load_mode: exercise.load_mode,
                ...(exercise.tracking_type
                  ? { tracking_type: exercise.tracking_type }
                  : {}),
                notes: "",
                rest_seconds: restSeconds,
                sets: [],
              })),
            ],
          },
        },
      };
    }),
  reviewVersion: (version) =>
    set((state) =>
      state.draft ? { draft: { ...state.draft, version } } : state,
    ),
  clear: () => set({ draft: null }),
}));
