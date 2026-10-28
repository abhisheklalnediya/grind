import type { TrainingSession } from "@/domain/training";
import { createTrainingApi } from "./api";
import { createTrainingOutbox } from "./outbox";
import { draftPersistence } from "./outboxPersistence";
import { emptyDraft, type DraftStorage } from "./outboxState";
import { TrainingError } from "./errors";
import {
  makeSession,
  makeCatalogExercise,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
import { projectCommand } from "./projection";
const editableSet = () => {
  const { completed_at: _completed, ...set } = makeSet();
  return set;
};
const add = {
  type: "add_exercise" as const,
  id: trainingId(9),
  exercise_id: trainingId(2),
  position: 0,
  load_mode: "external" as const,
  notes: "",
  rest_seconds: 60,
};
function harness(scope = "local:user") {
  const data = new Map<string, string>();
  const storage: DraftStorage = {
    getItem: jest.fn(async (key) => data.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      data.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      data.delete(key);
    }),
  };
  let server = makeSession(),
    id = 100;
  const api = {
    ...createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() }),
    active: jest.fn(async (): Promise<TrainingSession | null> => server),
    workout: jest.fn(async () => server),
    start: jest.fn(
      async (_operation: string, _routine: string | null, _timezone: string) =>
        server,
    ),
    apply: jest.fn(
      async (
        _operation: string,
        _id: string,
        revision: number,
        command: Parameters<ReturnType<typeof createTrainingApi>["apply"]>[3],
      ) => {
        server = {
          ...projectCommand(
            server,
            { command, catalog: makeCatalogExercise() },
            1000,
          ),
          revision: revision + 1,
        };
        return server;
      },
    ),
    finish: jest.fn(
      async (
        _operation: string,
        _id: string,
        _revision: number,
      ): Promise<TrainingSession> => ({
        ...server,
        status: "completed" as const,
      }),
    ),
    cancel: jest.fn(
      async (
        _operation: string,
        _id: string,
        _revision: number,
      ): Promise<TrainingSession> => ({
        ...server,
        status: "cancelled" as const,
      }),
    ),
  };
  const create = () =>
    createTrainingOutbox({
      scope,
      storage,
      api,
      uuid: () => trainingId(id++),
      clock: () => 1000,
    });
  return {
    data,
    storage,
    api,
    create,
    setServer: (value: typeof server) => {
      server = value;
    },
  };
}
it("persists before projection, sequences revisions and recovers raw edits and timer across restart", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  await box.command(add, makeCatalogExercise());
  await box.retry();
  await box.command({
    type: "upsert_set",
    exercise_id: add.id,
    set: editableSet(),
  });
  await box.retry();
  await box.setRaw(`${add.id}:${makeSet().id}:load`, "72.");
  const recovered = h.create();
  await recovered.hydrate();
  expect(recovered.snapshot().document.raw).toEqual(
    box.snapshot().document.raw,
  );
  await recovered.command({
    type: "upsert_set",
    exercise_id: add.id,
    set: editableSet(),
  });
  await recovered.retry();
  expect(recovered.snapshot().document.raw).toEqual({});
  await recovered.command({
    type: "complete_set",
    exercise_id: add.id,
    set_id: makeSet().id,
    completed: true,
  });
  await recovered.retry();
  expect(recovered.snapshot().document.timer?.ends_at).toBe(61000);
  await recovered.extendRest();
  expect(recovered.snapshot().document.timer?.ends_at).toBe(91000);
  const restarted = h.create();
  await restarted.hydrate();
  expect(restarted.snapshot().document.timer?.ends_at).toBe(91000);
  for (const invalid of [NaN, 14, 3601])
    await expect(restarted.restartRest(invalid)).rejects.toThrow();
  await restarted.restartRest(90);
  expect(restarted.snapshot().document.timer?.ends_at).toBe(91000);
  await restarted.skipRest();
  expect(restarted.snapshot().document.timer).toBeNull();
  await expect(restarted.restartRest(30)).rejects.toThrow();
  await restarted.extendRest();
  await expect(restarted.extendRest(0)).rejects.toThrow();
  expect(h.api.apply.mock.calls.map((call) => call[2])).toEqual([0, 1, 2, 3]);
  expect((await restarted.finish()).status).toBe("completed");
  expect(restarted.snapshot().session).toBeNull();
});
it("retains exact operations after lost responses, keeps conflicts explicit and reissues IDs only after review", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  h.api.apply.mockRejectedValueOnce(new TrainingError("network"));
  await box.command({ type: "rename_workout", name: "Push" });
  await expect(box.retry()).rejects.toThrow();
  const operation = box.snapshot().document.pending[0]?.operation_id;
  const restarted = h.create();
  await restarted.hydrate();
  expect(h.api.apply.mock.calls[1]?.[0]).toBe(operation);
  expect(restarted.snapshot().status).toBe("saved");
  h.api.apply.mockRejectedValueOnce(new TrainingError("conflict"));
  await restarted.command({ type: "rename_workout", name: "Pull" });
  await expect(restarted.retry()).rejects.toThrow();
  expect(restarted.snapshot().status).toBe("conflict");
  await restarted.retry();
  await expect(restarted.command(add)).rejects.toThrow();
  await restarted.reviewConflict();
  const previous = restarted.snapshot().document.pending[0]?.operation_id;
  await restarted.reapply();
  expect(h.api.apply.mock.calls.at(-1)?.[0]).not.toBe(previous);
  expect(restarted.snapshot().session?.name).toBe("Pull");
});
it("does not claim queued writes on storage failure and keeps partial text visible", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  jest.mocked(h.storage.setItem).mockRejectedValueOnce(new Error("disk full"));
  await expect(box.command(add)).rejects.toThrow();
  expect(box.snapshot().document.pending).toEqual([]);
  expect(h.api.apply).not.toHaveBeenCalled();
  jest.mocked(h.storage.setItem).mockRejectedValueOnce(new Error("disk full"));
  await expect(box.setRaw("x", "72.")).rejects.toThrow();
  expect(box.snapshot().document.raw.x).toBe("72.");
  expect(box.snapshot().status).toBe("error");
  await box.retry();
  expect(box.snapshot().status).toBe("saved");
  await expect(box.finish()).rejects.toThrow();
  await box.discardPending();
  expect(box.snapshot().document.raw).toEqual({});
  expect((await box.cancel()).status).toBe("cancelled");
  await expect(box.command(add)).rejects.toThrow();
  await expect(box.setRaw("x", "1")).rejects.toThrow();
});
it("fails closed on malformed local data and ignores old account responses after disposal", async () => {
  const h = harness();
  h.data.set("grind.training.v1.local%3Auser.active", "bad");
  const bad = h.create();
  await bad.hydrate();
  expect(bad.snapshot().status).toBe("error");
  expect(h.api.active).not.toHaveBeenCalled();
  await expect(bad.retry()).rejects.toThrow();
  h.data.clear();
  let resolve: (value: ReturnType<typeof makeSession>) => void = () =>
    undefined;
  h.api.active.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const old = h.create();
  const listener = jest.fn();
  const unsubscribe = old.subscribe(listener);
  const pending = old.hydrate();
  await Promise.resolve();
  await Promise.resolve();
  old.dispose();
  resolve(makeSession());
  await pending;
  expect(listener).not.toHaveBeenCalled();
  unsubscribe();
  await expect(old.command(add)).rejects.toThrow();
});
it("recovers start and terminal receipts with stable IDs and isolates scope storage", async () => {
  const h = harness();
  h.api.active.mockResolvedValue(null);
  const box = h.create();
  await box.hydrate();
  h.api.start.mockRejectedValueOnce(new TrainingError("network"));
  await expect(box.start(null)).rejects.toThrow();
  const operation = box.snapshot().document.start?.operation_id;
  await expect(box.start(null)).rejects.toThrow();
  await box.retry();
  expect(h.api.start.mock.calls[1]?.[0]).toBe(operation);
  h.api.cancel.mockRejectedValueOnce(new TrainingError("network"));
  await expect(box.cancel()).rejects.toThrow();
  await box.retry();
  expect(h.api.cancel.mock.calls[1]?.[0]).toBe(h.api.cancel.mock.calls[0]?.[0]);
  await box.start(trainingId(4));
  expect(h.api.start).toHaveBeenCalledTimes(3);
  const other = draftPersistence("different:user", h.storage);
  expect(await other.read()).toBeNull();
});
it("keeps edits when workout completed elsewhere and requires explicit resolution", async () => {
  const h = harness();
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
    raw: { x: "72." },
  });
  h.setServer({ ...makeSession(), status: "completed" });
  const box = h.create();
  await box.hydrate();
  expect(box.snapshot().status).toBe("conflict");
  expect(box.snapshot().document.raw.x).toBe("72.");
  await box.reviewConflict();
  await expect(box.reapply()).rejects.toThrow();
  await box.discardPending();
  expect(box.snapshot().hasLocalChanges).toBe(false);
  const blank = h.create();
  await blank.hydrate();
  await expect(blank.finish()).rejects.toThrow();
});
it("blocks finish/start while commands are pending and does not restore explicitly discarded operations", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  let resolve: (value: TrainingSession) => void = () => undefined;
  h.api.apply.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await box.command({ type: "rename_workout", name: "Pending" });
  await expect(box.finish()).rejects.toThrow();
  await expect(box.start(null)).rejects.toThrow();
  await box.discardPending();
  resolve({ ...makeSession(), revision: 1 });
  await box.retry();
  expect(box.snapshot().session?.name).toBe("Workout");
  expect(box.snapshot().document.pending).toEqual([]);
});
it("preserves reviewed newer snapshots when replaying old receipts and serializes queued edits", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  let resolve: (value: TrainingSession) => void = () => undefined;
  h.api.apply.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await box.command({ type: "rename_workout", name: "First" });
  await box.command({ type: "rename_workout", name: "Second" });
  h.setServer({ ...makeSession(), revision: 10, name: "Server" });
  await box.reviewConflict();
  resolve({ ...makeSession(), revision: 1, name: "Old receipt" });
  await box.retry();
  expect(box.snapshot().document.session?.revision).toBe(10);
});
it("reports raw-only revision conflicts and missing old-active sessions without losing input", async () => {
  const h = harness();
  const saved = { ...emptyDraft(), session: makeSession(), raw: { x: "72." } };
  await draftPersistence("local:user", h.storage).write(saved);
  h.setServer({ ...makeSession(), revision: 1 });
  const box = h.create();
  await box.hydrate();
  expect(box.snapshot().status).toBe("conflict");
  h.api.active.mockResolvedValue(null);
  const missing = h.create();
  await missing.hydrate();
  expect(h.api.workout).toHaveBeenCalledWith(makeSession().id);
  expect(missing.snapshot().document.raw.x).toBe("72.");
});
it("guards absent sessions and malformed raw limits while preserving stored bytes", async () => {
  const h = harness();
  h.api.active.mockResolvedValue(null);
  const box = h.create();
  await box.hydrate();
  await expect(box.reviewConflict()).rejects.toThrow();
  await expect(box.finish()).rejects.toThrow();
  await expect(box.command(add)).rejects.toThrow();
  await expect(box.setRaw("x", "1")).rejects.toThrow();
  await expect(box.reapply()).rejects.toThrow();
});
it("resumes an unresolved start envelope after a cold restart", async () => {
  const h = harness();
  h.api.active.mockResolvedValue(null);
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    start: { operation_id: trainingId(88), routine_id: null, timezone: "UTC" },
  });
  const box = h.create();
  await box.hydrate();
  expect(h.api.start).toHaveBeenCalledWith(trainingId(88), null, "UTC");
  expect(box.snapshot().document.start).toBeNull();
  expect(box.snapshot().session?.id).toBe(makeSession().id);
});
it("reviews removed exercises safely and reloads current server graph after old receipt replay", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  await box.command(add, makeCatalogExercise());
  await box.retry();
  h.api.apply.mockRejectedValueOnce(new TrainingError("conflict"));
  await box.command({
    type: "update_exercise",
    exercise_id: add.id,
    notes: "Local",
    rest_seconds: 60,
  });
  await expect(box.retry()).rejects.toThrow();
  h.setServer({ ...makeSession(), revision: 8 });
  await box.reviewConflict();
  expect(box.snapshot().session?.exercises).toEqual([]);
  expect(box.snapshot().document.pending).toHaveLength(1);
  await expect(box.reapply()).rejects.toThrow();
  expect(box.snapshot().status).toBe("conflict");
  await box.discardPending();
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
    pending: [
      {
        kind: "command",
        operation_id: trainingId(88),
        session_id: makeSession().id,
        expected_revision: 0,
        command: { type: "rename_workout", name: "Old receipt" },
      },
    ],
  });
  h.api.apply.mockResolvedValueOnce({
    ...makeSession(),
    revision: 1,
    name: "Old receipt",
  });
  const restarted = h.create();
  await restarted.hydrate();
  expect(restarted.snapshot().session?.revision).toBe(8);
});
it("detects a newly advanced server revision before replacing recovered raw input", async () => {
  const h = harness();
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
    raw: { x: "72." },
  });
  h.api.workout.mockResolvedValueOnce({ ...makeSession(), revision: 2 });
  const box = h.create();
  await box.hydrate();
  expect(box.snapshot().status).toBe("conflict");
  expect(box.snapshot().document.raw.x).toBe("72.");
});
it("preserves editing queued during the startup reconciliation boundary", async () => {
  const h = harness();
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
  });
  const box = h.create();
  let queued: Promise<void> | null = null;
  box.subscribe(() => {
    if (box.snapshot().status === "saved" && queued === null)
      queued = box.command({ type: "rename_workout", name: "New" });
  });
  await box.hydrate();
  if (queued) await queued;
  await box.retry();
  expect(box.snapshot().session?.name).toBe("New");
});

it("keeps a different authoritative active workout on cold restart", async () => {
  for (const status of ["active", "completed", "cancelled"] as const) {
    const h = harness();
    const old = { ...makeSession(), status };
    await draftPersistence("local:user", h.storage).write({
      ...emptyDraft(),
      session: old,
    });
    const active = {
      ...makeSession(),
      id: trainingId(99),
      name: "New device workout",
    };
    h.setServer(active);
    const box = h.create();
    await box.hydrate();
    expect(box.snapshot().session?.id).toBe(active.id);
    expect(h.api.workout).not.toHaveBeenCalled();
  }
});

it("replays committed finish/cancel receipts after cold restart and adopts the current active workout", async () => {
  for (const kind of ["finish", "cancel"] as const) {
    for (const anotherActive of [false, true]) {
      const h = harness();
      const operation = trainingId(80);
      const closed = {
        ...makeSession(),
        status:
          kind === "finish" ? ("completed" as const) : ("cancelled" as const),
        revision: 1,
      };
      const next = anotherActive
        ? { ...makeSession(), id: trainingId(99) }
        : null;
      h.setServer(closed);
      h.api.active.mockResolvedValue(next);
      h.api[kind].mockResolvedValueOnce(closed);
      await draftPersistence("local:user", h.storage).write({
        ...emptyDraft(),
        session: makeSession(),
        pending: [
          {
            kind,
            operation_id: operation,
            session_id: makeSession().id,
            expected_revision: 0,
          },
        ],
      });
      const box = h.create();
      await box.hydrate();
      expect(h.api[kind]).toHaveBeenCalledWith(operation, makeSession().id, 0);
      expect(box.snapshot().status).toBe("saved");
      expect(box.snapshot().document.pending).toEqual([]);
      expect(box.snapshot().session?.id ?? null).toBe(next?.id ?? null);
      expect(box.snapshot().hasLocalChanges).toBe(false);
    }
  }
});
it("keeps a terminal envelope after external completion rejects its receipt and retains retryable failures", async () => {
  for (const cause of [
    new TrainingError("validation"),
    new TrainingError("conflict"),
    new TrainingError("network"),
    Error("unexpected"),
  ]) {
    const h = harness();
    const pending = {
      kind: "cancel" as const,
      operation_id: trainingId(80),
      session_id: makeSession().id,
      expected_revision: 0,
    };
    await draftPersistence("local:user", h.storage).write({
      ...emptyDraft(),
      session: makeSession(),
      pending: [pending],
    });
    h.setServer({ ...makeSession(), status: "completed" });
    h.api.active.mockResolvedValue(null);
    h.api.cancel.mockRejectedValueOnce(cause);
    const box = h.create();
    await box.hydrate();
    expect(box.snapshot().status).toBe(
      cause instanceof TrainingError &&
        ["validation", "conflict"].includes(cause.kind)
        ? "conflict"
        : "error",
    );
    expect(box.snapshot().document.pending).toEqual([pending]);
    expect(h.api.active).toHaveBeenCalledTimes(1);
    if (box.snapshot().status === "conflict") {
      await box.reviewConflict();
      await expect(box.reapply()).rejects.toThrow();
    } else {
      await box.retry();
      expect(h.api.cancel.mock.calls[1]?.[0]).toBe(pending.operation_id);
    }
  }
});

it("persists explicitly cleared input across restart until a valid set command replaces it", async () => {
  const h = harness();
  const box = h.create();
  await box.hydrate();
  await box.command(add, makeCatalogExercise());
  await box.retry();
  await box.command({
    type: "upsert_set",
    exercise_id: add.id,
    set: editableSet(),
  });
  await box.retry();
  const key = `${add.id}:${makeSet().id}:load`;
  await box.setRaw(key, "");
  expect(box.snapshot().hasLocalChanges).toBe(true);
  const restarted = h.create();
  await restarted.hydrate();
  expect(restarted.snapshot().document.raw).toEqual({ [key]: "" });
  await expect(restarted.finish()).rejects.toThrow();
  await restarted.command({
    type: "upsert_set",
    exercise_id: add.id,
    set: editableSet(),
  });
  await restarted.retry();
  expect(restarted.snapshot().document.raw).toEqual({});
  expect(restarted.snapshot().hasLocalChanges).toBe(false);
});
it("does not replay ordinary edits against an externally closed workout", async () => {
  const h = harness();
  const pending = {
    kind: "command" as const,
    operation_id: trainingId(80),
    session_id: makeSession().id,
    expected_revision: 0,
    command: { type: "rename_workout" as const, name: "Local" },
  };
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
    pending: [pending],
  });
  h.setServer({ ...makeSession(), status: "completed" });
  h.api.active.mockResolvedValue(null);
  const box = h.create();
  await box.hydrate();
  expect(box.snapshot().status).toBe("conflict");
  expect(box.snapshot().document.pending).toEqual([pending]);
  expect(h.api.apply).not.toHaveBeenCalled();
});
it("preserves changes begun while terminal receipt reconciliation is waiting", async () => {
  for (const action of ["start", "command", "raw"] as const) {
    const h = harness();
    const closed = { ...makeSession(), status: "cancelled" as const };
    await draftPersistence("local:user", h.storage).write({
      ...emptyDraft(),
      session: makeSession(),
      pending: [
        {
          kind: "cancel",
          operation_id: trainingId(80),
          session_id: makeSession().id,
          expected_revision: 0,
        },
      ],
    });
    h.setServer(closed);
    h.api.cancel.mockResolvedValue(closed);
    let reconcile: (session: TrainingSession | null) => void = () => undefined;
    let reached: () => void = () => undefined;
    const waiting = new Promise<void>((resolve) => {
      reached = resolve;
    });
    h.api.active.mockResolvedValueOnce(null).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          reconcile = resolve;
          reached();
        }),
    );
    const box = h.create();
    const hydration = box.hydrate();
    await waiting;
    const next = { ...makeSession(), id: trainingId(99) };
    if (action === "start") {
      h.api.start.mockImplementationOnce(() => new Promise(() => {}));
      void box.start(null);
      for (let turn = 0; turn < 10; turn++) await Promise.resolve();
    } else {
      h.api.start.mockResolvedValueOnce(next);
      await box.start(null);
      if (action === "command") {
        h.api.apply.mockImplementationOnce(() => new Promise(() => {}));
        await box.command({ type: "rename_workout", name: "Local" });
      } else await box.setRaw("x", "");
    }
    reconcile(next);
    await hydration;
    expect(box.snapshot().status).toBe("conflict");
    expect(box.snapshot().hasLocalChanges).toBe(true);
    if (action === "start")
      expect(box.snapshot().document.start).not.toBeNull();
    else if (action === "command")
      expect(box.snapshot().document.pending).toHaveLength(1);
    else expect(box.snapshot().document.raw).toEqual({ x: "" });
    box.dispose();
  }
});

it("retries failed initial synchronization before claiming ready or allowing a new start", async () => {
  const h = harness();
  h.api.active.mockRejectedValueOnce(new TrainingError("network"));
  const box = h.create();
  await box.hydrate();
  expect(box.snapshot().status).toBe("error");
  await expect(box.start(null)).rejects.toMatchObject({ kind: "network" });
  expect(h.api.start).not.toHaveBeenCalled();
  const actual = {
    ...makeSession(),
    id: trainingId(99),
    name: "Existing workout",
  };
  h.setServer(actual);
  await box.retry();
  expect(h.api.active).toHaveBeenCalledTimes(2);
  expect(box.snapshot().session?.id).toBe(actual.id);
  expect(box.snapshot().status).toBe("saved");
  box.dispose();
  await expect(box.retry()).rejects.toMatchObject({ kind: "auth" });
});
it("shares in-flight hydration across retries and keeps unsaved memory after initial network/storage failures", async () => {
  const h = harness();
  await draftPersistence("local:user", h.storage).write({
    ...emptyDraft(),
    session: makeSession(),
    raw: { old: "72." },
  });
  h.api.active.mockRejectedValueOnce(new TrainingError("network"));
  const box = h.create();
  await box.hydrate();
  jest.mocked(h.storage.setItem).mockRejectedValueOnce(Error("disk full"));
  await expect(box.setRaw("new", "")).rejects.toThrow();
  let resolve: (session: TrainingSession) => void = () => undefined;
  h.api.active.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const retry = box.retry();
  const duplicate = box.retry();
  expect(h.api.active).toHaveBeenCalledTimes(2);
  resolve(makeSession());
  await Promise.all([retry, duplicate]);
  expect(box.snapshot().status).toBe("saved");
  expect(box.snapshot().document.raw).toEqual({ old: "72.", new: "" });
  expect(h.storage.getItem).toHaveBeenCalledTimes(2);
});
