import type { ReactNode } from "react";
import type {
  TrainingExercise,
  TrainingSession,
  WorkoutCommand,
} from "@/domain/training";
import type { TrainingApi } from "@/services/training/api";
import type {
  DraftStorage,
  OutboxStatus,
} from "@/services/training/outboxState";
export interface TrainingProviderProps {
  scope: string;
  enabled?: boolean;
  userId?: string;
  onCompleted?: (session: TrainingSession) => void;
  children: ReactNode;
  api?: TrainingApi;
  storage?: DraftStorage;
  uuid?: () => string;
  clock?: () => number;
}
export interface TrainingContextValue {
  api: TrainingApi | null;
  session: TrainingSession | null;
  savedSession: TrainingSession | null;
  status: OutboxStatus;
  pending: number;
  error: string;
  raw: Record<string, string>;
  hasLocalChanges: boolean;
  timerDeadline: number | null;
  start(routineId: string | null): Promise<TrainingSession>;
  command(command: WorkoutCommand, catalog?: TrainingExercise): Promise<void>;
  setRaw(key: string, value: string): Promise<void>;
  retry(): Promise<void>;
  reviewConflict(): Promise<void>;
  reapply(): Promise<void>;
  discardPending(): Promise<void>;
  finish(): Promise<TrainingSession>;
  cancel(): Promise<TrainingSession>;
  extendRest(seconds?: number): Promise<void>;
  skipRest(): Promise<void>;
  restartRest(seconds: number): Promise<void>;
}
