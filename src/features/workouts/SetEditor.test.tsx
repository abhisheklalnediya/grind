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

it("keeps options beside completion with accessible touch targets", async () => {
  const view = await render(<SetEditor exercise={exercise} set={set} />);
  const options = view.getByRole("button", {
    name: "Bench set 1: Set options",
  });
  expect(options).toHaveStyle({ minHeight: 50 });
  expect(
    view.getByRole("button", { name: "Bench set 1: Complete set" }),
  ).toHaveStyle({ minHeight: 50 });

  await fireEvent.press(options);
  expect(
    view.getByRole("button", { name: "Bench set 1: Make warm-up" }),
  ).toBeTruthy();
});

it("keeps focused keyboard controls reachable while set options are open", async () => {
  const view = await render(<SetEditor exercise={exercise} set={set} />);
  await fireEvent.press(
    view.getByRole("button", { name: "Bench set 1: Set options" }),
  );
  await fireEvent(view.getByLabelText("Bench set 1 Weight (kg)"), "focus");

  expect(
    view.getByRole("button", { name: "Bench set 1: Next, reps" }),
  ).toBeTruthy();
  expect(
    view.getByRole("button", { name: "Bench set 1: Done editing set" }),
  ).toBeTruthy();
  expect(
    view.getByRole("button", { name: "Bench set 1: Make warm-up" }),
  ).toBeTruthy();
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
