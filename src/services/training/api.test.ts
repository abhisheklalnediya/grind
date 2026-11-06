import { createTrainingApi, trainingApi } from "./api";
import { localTrainingTransport, type TrainingTransport } from "./transport";
import {
  makeCatalogExercise,
  makeRoutine,
  makeSession,
  trainingId,
  trainingTime,
} from "../../../tests/fixtures/training";
jest.mock("./transport", () => ({ localTrainingTransport: jest.fn() }));
function setup() {
  const port: TrainingTransport = { rpc: jest.fn(), catalog: jest.fn() };
  return { port, api: createTrainingApi(port) };
}
it("sends explicit ownerless workout commands and parses acknowledged session graphs", async () => {
  const { port, api } = setup();
  const session = makeSession();
  jest.mocked(port.rpc).mockResolvedValue(session);
  const operation = trainingId(9),
    id = session.id;
  expect(await api.start(operation, null, "UTC")).toEqual(session);
  expect(port.rpc).toHaveBeenLastCalledWith("start_workout", {
    p_operation_id: operation,
    p_routine_id: null,
    p_timezone: "UTC",
  });
  await api.active();
  await api.workout(id);
  await api.apply(operation, id, 0, {
    type: "rename_workout",
    name: "Upper day",
  });
  expect(port.rpc).toHaveBeenLastCalledWith("apply_workout_command", {
    p_operation_id: operation,
    p_session_id: id,
    p_expected_revision: 0,
    p_command: { type: "rename_workout", name: "Upper day" },
  });
  await api.finish(operation, id, 0);
  expect(port.rpc).toHaveBeenLastCalledWith(
    "finish_workout",
    expect.objectContaining({ p_expected_revision: 0 }),
  );
  await api.cancel(operation, id, 0);
  expect(port.rpc).toHaveBeenLastCalledWith(
    "cancel_workout",
    expect.objectContaining({ p_session_id: id }),
  );
  jest.mocked(port.rpc).mockResolvedValue(null);
  expect(await api.active()).toBeNull();
});
it("validates routine/custom exercise saves, archive and previous/history reads", async () => {
  const { port, api } = setup();
  const routine = makeRoutine(),
    exercise = makeCatalogExercise(),
    op = trainingId(9);
  jest.mocked(port.rpc).mockResolvedValue(routine);
  await api.saveRoutine(op, null, null, { name: routine.name, exercises: [] });
  await api.archiveRoutine(op, routine.id, 1);
  await api.routine(routine.id);
  jest.mocked(port.rpc).mockResolvedValue([routine]);
  expect(await api.routines()).toEqual([routine]);
  const {
    name,
    primary_muscle,
    equipment,
    category,
    load_convention,
    load_mode,
  } = exercise;
  jest.mocked(port.rpc).mockResolvedValue(exercise);
  await api.saveExercise(op, null, {
    name,
    primary_muscle,
    equipment,
    category,
    load_convention,
    load_mode,
  });
  await api.archiveExercise(op, exercise.id);
  jest.mocked(port.rpc).mockResolvedValue(null);
  expect(await api.previous(exercise.id, "external")).toBeNull();
  expect(port.rpc).toHaveBeenLastCalledWith("get_previous_performance", {
    p_exercise_id: exercise.id,
    p_load_mode: "external",
    p_load_convention: null,
  });
  expect(
    await api.previous(exercise.id, "external", "Original total load"),
  ).toBeNull();
  expect(port.rpc).toHaveBeenLastCalledWith("get_previous_performance", {
    p_exercise_id: exercise.id,
    p_load_mode: "external",
    p_load_convention: "Original total load",
  });
  jest.mocked(port.rpc).mockResolvedValue({ items: [], next_cursor: null });
  await api.history();
  expect(port.rpc).toHaveBeenLastCalledWith("list_workout_history", {
    p_before_finished_at: null,
    p_before_id: null,
    p_limit: 30,
  });
  await api.history({ id: trainingId(1), finished_at: trainingTime });
  expect(port.rpc).toHaveBeenLastCalledWith(
    "list_workout_history",
    expect.objectContaining({
      p_before_id: trainingId(1),
      p_before_finished_at: trainingTime,
    }),
  );
});
it("serializes all exact set types and accepts them in acknowledged session data", async () => {
  const { port, api } = setup();
  const setTypes = ["warmup", "working", "drop", "failure", "rest_pause"] as const;
  const base = makeSession();
  for (const set_type of setTypes) {
    const set = {
      id: trainingId(8),
      position: 0,
      set_type,
      entered_load: "20",
      entered_unit: "kg" as const,
      reps: 8,
    };
    const acknowledged = {
      ...base,
      exercises: [{
        id: trainingId(7),
        exercise_id: trainingId(6),
        position: 0,
        load_mode: "external" as const,
        notes: "",
        rest_seconds: 120,
        name: "Bench press",
        load_convention: "Total barbell weight",
        sets: [{ ...set, completed_at: null }],
      }],
    };
    jest.mocked(port.rpc).mockResolvedValue(acknowledged);
    const result = await api.apply(trainingId(9), base.id, 0, {
      type: "upsert_set",
      exercise_id: trainingId(7),
      set,
    });
    expect(result.exercises[0]?.sets[0]?.set_type).toBe(set_type);
    expect(port.rpc).toHaveBeenLastCalledWith(
      "apply_workout_command",
      expect.objectContaining({
        p_command: expect.objectContaining({
          type: "upsert_set",
          set: expect.objectContaining({ set_type }),
        }),
      }),
    );
  }
});
it("rejects unsafe response shapes and invalid drafts instead of claiming saved", async () => {
  const { port, api } = setup();
  jest.mocked(port.rpc).mockResolvedValue({ id: "wrong" });
  await expect(api.active()).rejects.toMatchObject({ kind: "response" });
  jest.mocked(port.catalog).mockResolvedValue([makeCatalogExercise()]);
  expect(await api.catalog()).toHaveLength(1);
  jest.mocked(port.catalog).mockResolvedValue([{ id: "wrong" }]);
  await expect(api.catalog()).rejects.toMatchObject({ kind: "response" });
  expect(() =>
    api.saveRoutine(trainingId(9), null, null, { name: "", exercises: [] }),
  ).toThrow();
  jest.mocked(localTrainingTransport).mockReturnValue(port);
  expect(trainingApi("user-a")).toBeDefined();
});

it("validates bounded catalog searches and server responses", async () => {
  const { port, api } = setup();
  const exercise = makeCatalogExercise();
  jest.mocked(port.rpc).mockResolvedValue([exercise]);
  expect(
    await api.searchCatalog({ query: " curl ", muscle: "biceps", limit: 10 }),
  ).toEqual([exercise]);
  expect(port.rpc).toHaveBeenCalledWith("search_catalog", {
    p_query: "curl",
    p_muscle: "biceps",
    p_equipment: null,
    p_after_name: null,
    p_after_id: null,
    p_limit: 10,
    p_custom: false,
  });
  expect(() => api.searchCatalog({ query: "x", limit: 51 })).toThrow();
  jest.mocked(port.rpc).mockResolvedValue([{ id: "invalid" }]);
  await expect(api.searchCatalog({ query: "" })).rejects.toMatchObject({
    kind: "response",
  });
});
it("requests previous values for the same tracking type", async () => {
  const { port, api } = setup();
  jest.mocked(port.rpc).mockResolvedValue(null);
  await api.previous(trainingId(1), "bodyweight", "Timed", "duration");
  expect(port.rpc).toHaveBeenCalledWith(
    "get_previous_performance",
    expect.objectContaining({ p_tracking_type: "duration" }),
  );
});
it("reads exact supported set types and rejects malformed or unavailable capabilities", async () => {
  const { port, api } = setup();
  const supported = ["warmup", "working", "drop", "failure", "rest_pause"];
  jest.mocked(port.rpc).mockResolvedValue({ set_types: supported });
  expect(await api.supportedSetTypes()).toEqual(supported);
  expect(port.rpc).toHaveBeenLastCalledWith("get_supported_set_types", {});

  for (const malformed of [
    { set_types: ["warmup", "unknown"] },
    { set_types: ["working", "working"] },
    { set_types: "warmup" },
    ["warmup", "working"],
    null,
  ]) {
    jest.mocked(port.rpc).mockResolvedValue(malformed);
    await expect(api.supportedSetTypes()).rejects.toMatchObject({
      kind: "response",
    });
  }
  const unavailable = new Error("RPC unavailable");
  jest.mocked(port.rpc).mockRejectedValue(unavailable);
  await expect(api.supportedSetTypes()).rejects.toBe(unavailable);
});
