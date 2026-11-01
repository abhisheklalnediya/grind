import { fireEvent, render } from "@testing-library/react-native";
import { makeSet, trainingId } from "../../../tests/fixtures/training";
import type { TrainingSession } from "@/domain/training";
import { ExerciseEditor } from "./ExerciseEditor";

const mockCommand = jest.fn().mockResolvedValue(undefined);
const mockTraining = {
  raw: {} as Record<string, string>,
  session: null as TrainingSession | null,
  api: null,
  command: mockCommand,
};
jest.mock("@/features/training", () => ({
  useTraining: () => mockTraining,
}));
jest.mock("@/features/preferences", () => ({
  useTrainingDefaults: () => ({
    unit: "kg",
    pending: false,
    error: null,
    retry: jest.fn(),
  }),
}));
jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    scope: "test",
    colors: {
      text: "#fff",
      secondary: "#aaa",
      surface: "#222",
      border: "#555",
      error: "#f00",
    },
  }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isError: false,
    isPending: false,
    data: null,
    refetch: jest.fn(),
  }),
}));
jest.mock("./useWorkoutDraft", () => ({
  useWorkoutDraft: (_key: string, initial: string) => ({
    value: initial,
    latest: { current: initial },
    change: jest.fn(),
  }),
}));

const set = makeSet();
const exercise: TrainingSession["exercises"][number] = {
  id: trainingId(2),
  exercise_id: trainingId(9),
  position: 0,
  name: "Bench press",
  load_convention: "Total barbell weight",
  load_mode: "external",
  notes: "",
  rest_seconds: 120,
  sets: [set],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.session = { ...({} as TrainingSession), exercises: [exercise] };
});

it("renders the prototype exercise card and one shared set header", async () => {
  const view = await render(<ExerciseEditor exercise={exercise} />);

  expect(view.getByRole("header", { name: "Bench press" })).toBeTruthy();
  expect(
    view.getByText("Weight (kg) · Total barbell weight · Rest 2:00"),
  ).toBeTruthy();
  expect(view.getByText("PREVIOUS")).toBeTruthy();
  expect(view.getByText("REPS")).toBeTruthy();
  expect(
    view.getByRole("button", { name: "Bench press set 1: Complete set" }),
  ).toBeTruthy();
  expect(view.getByRole("button", { name: "Add set" })).toBeTruthy();
});

it("opens exercise options from the accessible overflow menu", async () => {
  const view = await render(<ExerciseEditor exercise={exercise} />);
  await fireEvent.press(
    view.getByRole("button", { name: "Options for Bench press" }),
  );

  expect(view.getByLabelText("Bench press notes")).toBeTruthy();
  expect(view.getByRole("button", { name: "Remove exercise" })).toBeTruthy();
});
