import { fireEvent, render } from "@testing-library/react-native";
import { makeSet, trainingId } from "../../../tests/fixtures/training";
import type { TrainingSession } from "@/domain/training";
import { TimedSetEditor } from "./TimedSetEditor";

const mockCommand = jest.fn().mockResolvedValue(undefined);
const mockSetRaw = jest.fn().mockResolvedValue(undefined);
const mockTraining = {
  raw: {} as Record<string, string>,
  command: mockCommand,
  setRaw: mockSetRaw,
};
jest.mock("@/features/training", () => ({
  useTraining: () => mockTraining,
}));

const timedSet = { ...makeSet(), entered_load: null, reps: null };
const exercise: TrainingSession["exercises"][number] = {
  id: trainingId(2),
  exercise_id: trainingId(9),
  position: 0,
  name: "Run",
  load_convention: "Duration and distance",
  load_mode: "bodyweight",
  tracking_type: "distance_duration",
  notes: "",
  rest_seconds: 60,
  sets: [timedSet],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.raw = {};
});

it("reports an invalid duration by field and keeps the set incomplete", async () => {
  const view = await render(
    <TimedSetEditor exercise={exercise} set={timedSet} />,
  );
  await fireEvent.changeText(
    view.getByLabelText("Run set 1 duration seconds"),
    "12.5",
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Run set 1: Complete set" }),
  );
  expect(view.getByRole("alert")).toHaveTextContent(
    "Duration must be a whole number from 1 to 86400 seconds.",
  );
  expect(mockCommand).not.toHaveBeenCalled();
});

it("identifies the missing required distance on completion", async () => {
  const view = await render(
    <TimedSetEditor exercise={exercise} set={timedSet} />,
  );
  await fireEvent.changeText(
    view.getByLabelText("Run set 1 duration seconds"),
    "60",
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Run set 1: Complete set" }),
  );
  expect(view.getByRole("alert")).toHaveTextContent(
    "Enter a distance before completing this set.",
  );
  expect(mockCommand).not.toHaveBeenCalled();
});

it("allows undoing a completed timed set while preserving invalid draft values", async () => {
  const completed = { ...timedSet, completed_at: "2026-10-31T10:00:00.000Z" };
  mockTraining.raw = {
    [`${exercise.id}:${timedSet.id}:duration`]: "12.5",
    [`${exercise.id}:${timedSet.id}:distance`]: "bad",
  };
  const view = await render(
    <TimedSetEditor exercise={exercise} set={completed} />,
  );

  await fireEvent.press(
    view.getByRole("button", { name: "Run set 1: Mark incomplete" }),
  );

  expect(mockCommand).toHaveBeenCalledWith({
    type: "complete_set",
    exercise_id: exercise.id,
    set_id: timedSet.id,
    completed: false,
  });
  expect(mockTraining.raw[`${exercise.id}:${timedSet.id}:duration`]).toBe(
    "12.5",
  );
  expect(mockTraining.raw[`${exercise.id}:${timedSet.id}:distance`]).toBe(
    "bad",
  );
});

it("shows the distance unit and opens per-set options from the set number", async () => {
  const view = await render(
    <TimedSetEditor
      exercise={exercise}
      set={{ ...timedSet, distance_unit: "mi" }}
    />,
  );
  expect(view.getByText("mi")).toBeVisible();
  await fireEvent.press(view.getByRole("button", { name: "Run set 1: Set type: Working set" }));
  await fireEvent.press(view.getByRole("button", { name: "More set actions" }));
  expect(
    view.getByRole("button", { name: "Run set 1 distance unit" }),
  ).toBeVisible();
  expect(
    view.getByRole("button", { name: "Run set 1: Set type: Working set" }),
  ).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "Run set 1: Set type: Working set" }));
  await fireEvent.press(view.getByRole("button", { name: "Hide set actions" }));
  expect(view.queryByRole("button", { name: "Run set 1 distance unit" })).toBeNull();
});

it("selects supported drop type and rejects type changes with invalid raw measurements", async () => {
  const view = await render(
    <TimedSetEditor
      exercise={exercise}
      set={timedSet}
      supportedTypes={["warmup", "working", "drop"]}
    />,
  );
  await fireEvent.press(view.getByRole("button", { name: "Run set 1: Set type: Working set" }));
  await fireEvent.press(view.getByRole("button", { name: "Drop set" }));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "upsert_set",
      set: expect.objectContaining({ set_type: "drop" }),
    }),
  );

  mockCommand.mockClear();
  mockTraining.raw = { [`${exercise.id}:${timedSet.id}:duration`]: "12.5" };
  const invalid = await render(
    <TimedSetEditor
      exercise={exercise}
      set={timedSet}
      supportedTypes={["warmup", "working", "drop"]}
    />,
  );
  await fireEvent.press(invalid.getByRole("button", { name: "Run set 1: Set type: Working set" }));
  await fireEvent.press(invalid.getByRole("button", { name: "Drop set" }));
  expect(invalid.getByRole("alert")).toHaveTextContent(
    "Duration must be a whole number from 1 to 86400 seconds.",
  );
  expect(mockCommand).not.toHaveBeenCalled();
});
