import {
  sessionSchema,
  workoutCommandSchema,
  type TrainingExercise,
  type TrainingSession,
  type WorkoutCommand,
} from "@/domain/training";
import type { TrainingApi } from "./api";
import { TrainingError } from "./errors";
import { draftPersistence } from "./outboxPersistence";
import {
  canFinish,
  clearCommandRaw,
  commandTimer,
  emptyDraft,
  type DraftDocument,
  type DraftStorage,
  type OutboxStatus,
  type QueuedMutation,
} from "./outboxState";
import { projectPending } from "./projection";
export interface OutboxOptions {
  scope: string;
  api: TrainingApi;
  storage: DraftStorage;
  uuid: () => string;
  clock: () => number;
}
export interface OutboxSnapshot {
  document: DraftDocument;
  session: TrainingSession | null;
  status: OutboxStatus;
  error: string;
  hasLocalChanges: boolean;
}
export function createTrainingOutbox(options: OutboxOptions) {
  const persistence = draftPersistence(options.scope, options.storage);
  let document = emptyDraft(),
    status: OutboxStatus = "loading",
    error = "",
    disposed = false,
    corrupt = false,
    loaded = false,
    synced = false;
  let editing = Promise.resolve(),
    flushing: Promise<void> | null = null,
    hydrating: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const projected = () =>
    projectPending(
      document.session,
      document.pending.filter((item) => item.kind === "command"),
      options.clock(),
    );
  const snapshot = (): OutboxSnapshot => ({
    document,
    session:
      document.session?.status === "active"
        ? status === "conflict"
          ? document.session
          : projected()
        : null,
    status,
    error,
    hasLocalChanges: Boolean(
      document.start ||
        document.pending.length ||
        Object.keys(document.raw).length,
    ),
  });
  const emit = () => {
    listeners.forEach((listener) => listener());
  };
  const assertLive = () => {
    if (disposed) throw new TrainingError("auth");
    if (corrupt) throw new TrainingError("response");
  };
  const report = (cause: unknown) => {
    if (disposed) return;
    status =
      status === "conflict" ||
      (cause instanceof TrainingError && cause.kind === "conflict")
        ? "conflict"
        : "error";
    error =
      cause instanceof TrainingError
        ? cause.message
        : "Your changes could not be saved. Retry when ready.";
    emit();
  };
  const persist = async (next: DraftDocument) => {
    assertLive();
    await persistence.write(next);
    assertLive();
    document = next;
    emit();
  };
  const edit = <T>(action: () => Promise<T>): Promise<T> => {
    const result = editing.then(() => {
      assertLive();
      return action();
    });
    editing = result.then(
      () => undefined,
      (cause) => {
        report(cause);
      },
    );
    return result;
  };
  async function flushLoop() {
    await editing;
    assertLive();
    if (status === "conflict") return;
    status = "saving";
    error = "";
    emit();
    try {
      // Persist volatile raw fields before sending anything after a storage failure.
      await persistence.write(document);
      assertLive();
      if (document.start) {
        const start = document.start;
        const session = await options.api.start(
          start.operation_id,
          start.routine_id,
          start.timezone,
        );
        await edit(() => persist({ ...document, session, start: null }));
      }
      while (true) {
        assertLive();
        const item = document.pending[0];
        if (!item) break;
        const session =
          item.kind === "command"
            ? await options.api.apply(
                item.operation_id,
                item.session_id,
                item.expected_revision,
                item.command,
              )
            : await options.api[item.kind](
                item.operation_id,
                item.session_id,
                item.expected_revision,
              );
        await edit(async () => {
          // A lost response may replay an old receipt. Never downgrade an explicitly reviewed snapshot.
          if (
            !document.pending.some(
              (entry) => entry.operation_id === item.operation_id,
            )
          )
            return;
          const saved =
            document.session && document.session.revision > session.revision
              ? document.session
              : session;
          await persist({
            ...document,
            session: saved,
            pending: document.pending.filter(
              (entry) => entry.operation_id !== item.operation_id,
            ),
            timer: session.status === "active" ? document.timer : null,
          });
        });
      }
      assertLive();
      status = "saved";
      error = "";
      emit();
    } catch (cause) {
      report(cause);
      throw cause;
    }
  }
  function flush(): Promise<void> {
    if (flushing) return flushing;
    const task = flushLoop();
    flushing = task;
    void task
      .finally(() => {
        flushing = null;
      })
      .catch(() => undefined);
    return task;
  }
  function hydrate(): Promise<void> {
    if (hydrating) return hydrating;
    const task = hydrateLoop().finally(() => {
      hydrating = null;
    });
    hydrating = task;
    return task;
  }
  async function hydrateLoop() {
    try {
      if (!loaded) {
        let stored: DraftDocument | null;
        try {
          stored = await persistence.read();
        } catch (cause) {
          corrupt = true;
          throw cause;
        }
        assertLive();
        loaded = true;
        if (stored) {
          document = stored;
          emit();
        }
      }
      const active = await options.api.active();
      assertLive();
      synced = true;
      // Retries use current memory, including raw text retained after storage failure.
      const local = document;
      if (
        local?.session &&
        (local.pending.length || Object.keys(local.raw).length)
      ) {
        const current =
          active?.id === local.session.id
            ? active
            : await options.api.workout(local.session.id);
        assertLive();
        // A closed graph can be our own committed terminal command with a lost response.
        // Only the original operation receipt may acknowledge that envelope.
        if (
          current.status !== "active" &&
          local.pending.length === 1 &&
          local.pending.some((item) => item.kind !== "command")
        ) {
          try {
            await flush();
          } catch (cause) {
            if (
              cause instanceof TrainingError &&
              (cause.kind === "validation" || cause.kind === "conflict")
            )
              throw new TrainingError("conflict");
            throw cause;
          }
          assertLive();
          const latestActive = await options.api.active();
          await edit(async () => {
            if (
              document.start ||
              document.pending.length ||
              Object.keys(document.raw).length
            )
              throw new TrainingError("conflict");
            await persist({ ...emptyDraft(), session: latestActive });
          });
          return;
        }
        // Even if the revision advanced, replay identical operation receipts first. A genuinely stale command returns conflict.
        if (
          current.status !== "active" ||
          (!local.pending.length && current.revision !== local.session.revision)
        ) {
          status = "conflict";
          error = "This workout changed elsewhere. Review your local changes.";
          emit();
          return;
        }
      } else if (!local?.start)
        await persist({
          ...emptyDraft(),
          session: active,
          timer:
            active?.id === local?.session?.id ? (local?.timer ?? null) : null,
        });
      await flush();
      const localSession = local?.session;
      if (localSession && document.session?.id === localSession.id)
        await edit(async () => {
          if (document.pending.length) return;
          const current = await options.api.workout(localSession.id);
          if (
            Object.keys(document.raw).length &&
            current.revision !== document.session?.revision
          ) {
            status = "conflict";
            error =
              "This workout changed elsewhere. Review your local changes.";
            emit();
            return;
          }
          await persist({
            ...document,
            session: current,
            timer: current.status === "active" ? document.timer : null,
          });
        });
    } catch (cause) {
      synced = false;
      report(cause);
    }
  }
  async function enqueue(
    kind: "command",
    command: WorkoutCommand,
    catalog?: TrainingExercise,
  ): Promise<void> {
    await edit(async () => {
      if (status === "conflict") throw new TrainingError("conflict");
      const session = projected();
      if (
        !session ||
        session.status !== "active" ||
        document.pending.some((item) => item.kind !== "command")
      )
        throw new TrainingError("validation");
      const valid = workoutCommandSchema.parse(command);
      const entry: QueuedMutation = {
        kind,
        operation_id: options.uuid(),
        session_id: session.id,
        expected_revision: session.revision + document.pending.length,
        command: valid,
        ...(catalog ? { catalog } : {}),
      };
      projectPending(session, [entry], options.clock());
      await persist({
        ...document,
        pending: [...document.pending, entry],
        raw: clearCommandRaw(document.raw, valid),
        timer: commandTimer({ ...document, session }, valid, options.clock()),
      });
    });
    void flush().catch(() => undefined);
  }
  async function terminal(kind: "finish" | "cancel") {
    await edit(async () => {
      const session = projected();
      if (
        status === "conflict" ||
        !session ||
        document.pending.length ||
        document.start ||
        (kind === "finish" &&
          (Object.keys(document.raw).length > 0 || !canFinish(session)))
      )
        throw new TrainingError("validation");
      await persist({
        ...document,
        pending: [
          {
            kind,
            operation_id: options.uuid(),
            session_id: session.id,
            expected_revision: session.revision,
          },
        ],
        ...(kind === "cancel" ? { raw: {}, timer: null } : {}),
      });
    });
    await flush();
    return sessionSchema.parse(document.session);
  }
  return {
    snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    dispose() {
      disposed = true;
      listeners.clear();
    },
    async start(routineId: string | null) {
      await edit(async () => {
        if (!synced) throw new TrainingError("network");
        if (
          document.session?.status === "active" ||
          document.start ||
          document.pending.length ||
          Object.keys(document.raw).length
        )
          throw new TrainingError("validation");
        await persist({
          ...emptyDraft(),
          start: {
            operation_id: options.uuid(),
            routine_id: routineId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
      });
      await flush();
      return sessionSchema.parse(document.session);
    },
    command: (command: WorkoutCommand, catalog?: TrainingExercise) =>
      enqueue("command", command, catalog),
    setRaw: (key: string, value: string) =>
      edit(async () => {
        if (!document.session || document.session.status !== "active")
          throw new TrainingError("validation");
        const raw = { ...document.raw };
        // Empty text is an explicit unsaved edit, not an absent draft field.
        raw[key] = value;
        // Keep typing visible if disk is full. Saved status is never claimed on this path.
        document = { ...document, raw };
        emit();
        await persist(document);
      }),
    retry: async () => {
      assertLive();
      if (synced || status === "conflict") await flush();
      else await hydrate();
    },
    reviewConflict: () =>
      edit(async () => {
        if (!document.session) throw new TrainingError("validation");
        const session = await options.api.workout(document.session.id);
        status = "conflict";
        await persist({ ...document, session });
        status = "conflict";
        error = "Review changes, then reapply or discard your local edits.";
        emit();
      }),
    reapply: async () => {
      await edit(async () => {
        if (status !== "conflict" || document.session?.status !== "active")
          throw new TrainingError("validation");
        const session = document.session;
        const pending = document.pending.map((item, index) => ({
          ...item,
          operation_id: options.uuid(),
          expected_revision: session.revision + index,
        }));
        projectPending(
          session,
          pending.filter((item) => item.kind === "command"),
          options.clock(),
        );
        await persist({ ...document, pending });
        status = "saved";
        error = "";
        emit();
      });
      await flush();
    },
    discardPending: () =>
      edit(async () => {
        await persist({ ...emptyDraft(), session: document.session });
        status = "saved";
        error = "";
        emit();
      }),
    finish: () => terminal("finish"),
    cancel: () => terminal("cancel"),
    extendRest: (seconds = 30) =>
      edit(async () => {
        if (!Number.isFinite(seconds) || seconds <= 0)
          throw new TrainingError("validation");
        if (document.timer)
          await persist({
            ...document,
            timer: {
              ...document.timer,
              ends_at:
                Math.max(options.clock(), document.timer.ends_at) +
                seconds * 1000,
            },
          });
      }),
    restartRest: (seconds: number) =>
      edit(async () => {
        if (
          !Number.isInteger(seconds) ||
          seconds < 15 ||
          seconds > 3600 ||
          !document.timer
        )
          throw new TrainingError("validation");
        await persist({
          ...document,
          timer: {
            ...document.timer,
            ends_at: options.clock() + seconds * 1000,
          },
        });
      }),
    skipRest: () => edit(() => persist({ ...document, timer: null })),
  };
}
export type TrainingOutbox = ReturnType<typeof createTrainingOutbox>;
