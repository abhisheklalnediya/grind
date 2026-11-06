import { fireEvent, render } from "@testing-library/react-native";
import { makeSet, trainingId } from "../../../tests/fixtures/training";
import type { TrainingSession } from "@/domain/training";
import { SetEditor } from "./SetEditor";

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

const set = makeSet();
const exercise: TrainingSession["exercises"][number] = {
  id: trainingId(2),
  exercise_id: trainingId(9),
  position: 0,
  name: "Bench",
  load_convention: "Total load",
  load_mode: "external",
  notes: "",
  rest_seconds: 60,
  sets: [set],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.raw = {};
});

it("keeps set options and completion accessible with touch targets", async () => {
  const view = await render(<SetEditor exercise={exercise} set={set} />);
  const options = view.getByRole("button", {
    name: "Bench set 1: Set type: Working set",
  });
  expect(options).toHaveStyle({ minHeight: 48 });
  expect(
    view.getByRole("button", { name: "Bench set 1: Complete set" }),
  ).toHaveStyle({ minHeight: 50 });

  await fireEvent.press(options);
  expect(view.getByRole("button", { name: "Warm-up set" })).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "Warm-up set" }));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "upsert_set",
      set: expect.objectContaining({ set_type: "warmup" }),
    }),
  );
});

it("keeps set options available without extra keyboard buttons", async () => {
  const view = await render(<SetEditor exercise={exercise} set={set} />);
  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Set type: Working set" }),
  );
  await fireEvent.press(view.getByRole("button", { name: "More set actions" }));
  await fireEvent(view.getByLabelText("Bench set 1 Weight (kg)"), "focus");
  expect(view.queryByText("Next: reps")).toBeNull();
  expect(view.queryByText("Done editing set")).toBeNull();
  expect(
    view.getByRole("button", { name: "Bench set 1: Move set up" }),
  ).toBeTruthy();
  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Set type: Working set" }),
  );
  await fireEvent.press(view.getByRole("button", { name: "Hide set actions" }));
  expect(view.queryByText("Move set up")).toBeNull();
});

it("selects a supported drop type but rejects switching with invalid raw values", async () => {
  const view = await render(
    <SetEditor
      exercise={exercise}
      set={set}
      supportedTypes={["warmup", "working", "drop"]}
    />,
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Set type: Working set" }),
  );
  await fireEvent.press(view.getByRole("button", { name: "Drop set" }));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      set: expect.objectContaining({ set_type: "drop" }),
    }),
  );

  mockCommand.mockClear();
  mockTraining.raw = { [`${exercise.id}:${set.id}:load`]: "invalid" };
  const invalid = await render(
    <SetEditor
      exercise={exercise}
      set={set}
      supportedTypes={["warmup", "working", "drop"]}
    />,
  );
  await fireEvent.press(
    invalid.getByRole("button", { name: "Bench set 1: Set type: Working set" }),
  );
  await fireEvent.press(invalid.getByRole("button", { name: "Drop set" }));
  expect(
    invalid.getByText("Fix the entered values before changing set type."),
  ).toBeTruthy();
  expect(mockCommand).not.toHaveBeenCalled();
});

it("allows undoing a completed set without replacing an invalid saved draft", async () => {
  const completed = { ...set, completed_at: "2026-10-31T10:00:00.000Z" };
  mockTraining.raw = { [`${exercise.id}:${set.id}:load`]: "invalid" };
  const view = await render(<SetEditor exercise={exercise} set={completed} />);

  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Mark incomplete" }),
  );

  expect(mockCommand).toHaveBeenCalledWith({
    type: "complete_set",
    exercise_id: exercise.id,
    set_id: set.id,
    completed: false,
  });
  expect(mockTraining.raw[`${exercise.id}:${set.id}:load`]).toBe("invalid");
});

it("distinguishes incomplete and completed sets and shows units for mixed entries", async () => {
  const view = await render(
    <SetEditor exercise={exercise} set={set} showUnit />,
  );
  expect(view.getByText("kg")).toBeVisible();
  expect(
    view.getByRole("button", { name: "Bench set 1: Complete set" }),
  ).toHaveStyle({ backgroundColor: "#1B2026" });
  const completed = { ...set, completed_at: "2026-10-31T10:00:00.000Z" };
  await view.rerender(
    <SetEditor exercise={{ ...exercise, sets: [completed] }} set={completed} />,
  );
  expect(
    view.getByRole("button", { name: "Bench set 1: Mark incomplete" }),
  ).toHaveStyle({ backgroundColor: "#E8F84C" });
});

it("preserves a legacy rest-pause row without offering it as a choice", async () => {
  const legacy = { ...set, set_type: "rest_pause" as const };
  const view = await render(
    <SetEditor
      exercise={{ ...exercise, sets: [legacy] }}
      set={legacy}
      supportedTypes={["warmup", "working", "drop", "failure", "rest_pause"]}
    />,
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Set type: Rest-pause set" }),
  );
  expect(view.queryByRole("button", { name: "Rest-pause set" })).toBeNull();
  expect(view.getByRole("button", { name: "Drop set" })).toBeVisible();
  expect(mockCommand).not.toHaveBeenCalled();
});
