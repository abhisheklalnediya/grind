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
