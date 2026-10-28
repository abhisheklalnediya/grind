import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trainingApi } from "@/services/training/api";
import {
  createTrainingOutbox,
  type TrainingOutbox,
  type OutboxSnapshot,
} from "@/services/training/outbox";
import { emptyDraft } from "@/services/training/outboxState";
import { TrainingError } from "@/services/training/errors";
import type { TrainingContextValue, TrainingProviderProps } from "./types";
const TrainingContext = createContext<TrainingContextValue | null>(null);
const empty = (): OutboxSnapshot => ({
  document: emptyDraft(),
  session: null,
  status: "saved",
  error: "",
  hasLocalChanges: false,
});
export function TrainingProvider({
  scope,
  enabled = true,
  userId,
  onCompleted,
  api: injectedApi,
  storage = AsyncStorage,
  uuid = randomUUID,
  clock = Date.now,
  children,
}: TrainingProviderProps) {
  const api = useMemo(
    () =>
      enabled ? (injectedApi ?? (userId ? trainingApi(userId) : null)) : null,
    [enabled, injectedApi, userId],
  );
  const configuration = useMemo(
    () => ({ scope, api, storage, uuid, clock }),
    [scope, api, storage, uuid, clock],
  );
  const [state, setState] = useState<{
    configuration: typeof configuration;
    controller: TrainingOutbox;
    snapshot: OutboxSnapshot;
  } | null>(null);
  useEffect(() => {
    if (!configuration.api) return;
    const controller = createTrainingOutbox({
      ...configuration,
      api: configuration.api,
    });
    const completed = new Set<string>();
    let alive = true;
    const update = () => {
      const snapshot = controller.snapshot();
      const session = snapshot.document.session;
      if (session?.status === "completed" && !completed.has(session.id)) {
        completed.add(session.id);
        onCompleted?.(session);
      }
      setState({ configuration, controller, snapshot });
    };
    const unsubscribe = controller.subscribe(update);
    update();
    void controller.hydrate();
    const foreground = AppState.addEventListener("change", (state) => {
      if (!alive || state !== "active") return;
      const snapshot = controller.snapshot();
      if (snapshot.status === "loading" || snapshot.status === "conflict")
        return;
      if (snapshot.hasLocalChanges || snapshot.status === "error")
        void controller.retry().catch(() => undefined);
    });
    return () => {
      alive = false;
      foreground.remove();
      unsubscribe();
      controller.dispose();
    };
  }, [configuration, onCompleted]);
  const controller =
    state?.configuration === configuration ? state.controller : null;
  const value = useMemo<TrainingContextValue>(() => {
    const snapshot =
      state?.configuration === configuration
        ? state.snapshot
        : {
            ...empty(),
            status: api ? ("loading" as const) : ("saved" as const),
          };
    const current = () => {
      if (!controller) throw new TrainingError("auth");
      return controller;
    };
    return {
      api,
      session: snapshot.session,
      savedSession: snapshot.document.session,
      status: snapshot.status,
      pending:
        snapshot.document.pending.length + (snapshot.document.start ? 1 : 0),
      error: snapshot.error,
      raw: snapshot.document.raw,
      hasLocalChanges: snapshot.hasLocalChanges,
      timerDeadline: snapshot.document.timer?.ends_at ?? null,
      start: async (routine) => current().start(routine),
      command: async (command, catalog) => current().command(command, catalog),
      setRaw: async (key, value) => current().setRaw(key, value),
      retry: async () => current().retry(),
      reviewConflict: async () => current().reviewConflict(),
      reapply: async () => current().reapply(),
      discardPending: async () => current().discardPending(),
      finish: async () => current().finish(),
      cancel: async () => current().cancel(),
      extendRest: async (seconds) => current().extendRest(seconds),
      skipRest: async () => current().skipRest(),
      restartRest: async (seconds) => current().restartRest(seconds),
    };
  }, [api, controller, configuration, state]);
  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}
export function useTraining(): TrainingContextValue {
  const context = useContext(TrainingContext);
  if (!context) throw new Error("useTraining requires TrainingProvider.");
  return context;
}
