import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTraining } from "@/features/training";
import { useTrainingDefaults } from "@/features/preferences";
import type { WorkoutCommand, TrainingExercise } from "@/domain/training";
import { createTrainingApi } from "@/services/training/api";
import {
  makeCatalogExercise,
  makeSession,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
import { ExerciseHistory } from "./ExerciseHistory";
import { ExercisePickerScreen } from "./ExercisePickerScreen";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
jest.mock("@/features/preferences", () => ({ useTrainingDefaults: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "10000000-0000-4000-8000-000000000099"),
}));
const exercise = makeCatalogExercise();
function setup() {
  const api = createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() });
  jest
    .spyOn(api, "catalog")
    .mockResolvedValue([
      exercise,
      { ...exercise, id: trainingId(8), name: "Squat" },
    ]);
  const history = jest
    .spyOn(api, "history")
    .mockResolvedValue({ items: [], next_cursor: null });
  const training = {
    api,
    session: makeSession(),
    command: jest
      .fn<Promise<void>, [WorkoutCommand, TrainingExercise?]>()
      .mockResolvedValue(undefined),
  };
  jest
    .mocked(useTraining)
    .mockImplementation(
      () => training as unknown as ReturnType<typeof useTraining>,
    );
  jest.mocked(useTrainingDefaults).mockReturnValue({
    unit: "lb",
    restSeconds: 90,
    pending: false,
    error: "",
    retry: jest.fn(),
  });
  return { api, history, training };
}
function wrap(child: React.ReactNode) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      {child}
    </QueryClientProvider>
  );
}
beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);
it("keeps stable exercise IDs and contiguous positions after a partial picker retry", async () => {
  const { training } = setup();
  training.command
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(Error("device storage"));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <ExercisePickerScreen target="workout" />
    </QueryClientProvider>,
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Bench press" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Squat" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Add 2 exercises" }),
  );
  await screen.findByText("device storage");
  const first = training.command.mock.calls[0]?.[0];
  const failed = training.command.mock.calls[1]?.[0];
  if (failed?.type !== "add_exercise")
    throw new Error("Expected add exercise retry");
  expect(first).toMatchObject({ position: 0, rest_seconds: 90 });
  expect(failed).toMatchObject({ position: 1 });
  training.session = {
    ...makeSession(),
    exercises: [
      {
        ...exercise,
        id: trainingId(20),
        exercise_id: exercise.id,
        position: 0,
        notes: "",
        rest_seconds: 90,
        sets: [],
      },
    ],
  };
  await view.rerender(
    <QueryClientProvider client={client}>
      <ExercisePickerScreen target="workout" />
    </QueryClientProvider>,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Add 2 exercises" }),
  );
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(training.command.mock.calls[2]?.[0]).toMatchObject({
    position: 1,
    id: failed?.id,
    rest_seconds: 90,
  });
});
it("blocks adding until saved preferences load and exposes their retry", async () => {
  setup();
  const retry = jest.fn();
  jest.mocked(useTrainingDefaults).mockReturnValue({
    unit: "lb",
    restSeconds: 90,
    pending: false,
    error: "Preferences unavailable",
    retry,
  });
  await render(wrap(<ExercisePickerScreen target="workout" />));
  await fireEvent.press(
    await screen.findByRole("button", { name: "Bench press" }),
  );
  expect(
    screen.getByRole("button", { name: "Add 1 exercises" }),
  ).toBeDisabled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Retry training preferences" }),
  );
  expect(retry).toHaveBeenCalled();
});
it("loads older exercise history across empty pages and qualifies stored mode and convention", async () => {
  const { history } = setup();
  const cursor = { finished_at: "2026-10-27T12:00:00Z", id: trainingId(40) };
  const row = {
    id: trainingId(10),
    exercise_id: exercise.id,
    position: 0,
    name: exercise.name,
    load_mode: exercise.load_mode,
    load_convention: exercise.load_convention,
    notes: "",
    rest_seconds: 120,
    sets: [{ ...makeSet(), completed_at: "2026-10-27T12:00:00Z" }],
  };
  const saved = {
    ...makeSession(),
    id: trainingId(41),
    status: "completed" as const,
    finished_at: "2026-10-26T12:00:00Z",
    name: "Older training",
    exercises: [
      row,
      {
        ...row,
        id: trainingId(11),
        load_convention: "Each hand",
        sets: [
          {
            ...makeSet(),
            id: trainingId(12),
            entered_load: "999",
            completed_at: "now",
          },
        ],
      },
    ],
  };
  history
    .mockResolvedValueOnce({ items: [], next_cursor: cursor })
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce({ items: [saved], next_cursor: null });
  await render(wrap(<ExerciseHistory exercise={exercise} />));
  await screen.findByText(
    "No matches in these workouts. Load more to search older history.",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Load older exercise history" }),
  );
  await screen.findByRole("button", { name: "Retry older exercise history" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Retry older exercise history" }),
  );
  await screen.findByText("Working 1: 60 kg × 8 reps");
  expect(screen.queryByText(/999/)).toBeNull();
  expect(history).toHaveBeenLastCalledWith(cursor);
  await fireEvent.press(screen.getByRole("button", { name: /Older training/ }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/history-detail",
    params: { id: saved.id },
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Refresh exercise history" }),
  );
});
it("shows initial history failure, retry and a definitive empty result", async () => {
  const { history } = setup();
  history.mockRejectedValueOnce(Error("offline"));
  await render(wrap(<ExerciseHistory exercise={exercise} />));
  await fireEvent.press(
    await screen.findByRole("button", { name: "Retry exercise history" }),
  );
  await screen.findByText(
    "No completed history for this exercise, load mode and convention.",
  );
});
it("does not query exercise history without a signed-in API", async () => {
  setup();
  jest
    .mocked(useTraining)
    .mockReturnValue({ api: null } as ReturnType<typeof useTraining>);
  await render(wrap(<ExerciseHistory exercise={exercise} />));
  expect(screen.getByText("Sign in to view exercise history.")).toBeVisible();
});
it("shows only completed matching rows and distinguishes warm-ups and bodyweight", async () => {
  const { history } = setup();
  const bodyweight = { ...exercise, load_mode: "bodyweight" as const };
  const row = {
    id: trainingId(10),
    exercise_id: exercise.id,
    position: 0,
    name: exercise.name,
    load_mode: bodyweight.load_mode,
    load_convention: exercise.load_convention,
    notes: "",
    rest_seconds: 120,
    sets: [
      {
        ...makeSet(),
        entered_load: null,
        set_type: "warmup" as const,
        completed_at: "2026-10-27T12:00:00Z",
      },
      { ...makeSet(), id: trainingId(13), completed_at: null },
    ],
  };
  history.mockResolvedValueOnce({
    items: [
      {
        ...makeSession(),
        status: "completed",
        finished_at: "2026-10-27T12:00:00Z",
        exercises: [
          row,
          { ...row, id: trainingId(14), exercise_id: trainingId(15) },
          { ...row, id: trainingId(16), load_mode: "external" },
        ],
      },
    ],
    next_cursor: null,
  });
  await render(wrap(<ExerciseHistory exercise={bodyweight} />));
  expect(
    await screen.findByText("Warm-up 1: Bodyweight × 8 reps"),
  ).toBeVisible();
  expect(screen.getAllByText(/Warm-up 1/)).toHaveLength(1);
  expect(screen.queryByText(/Working/)).toBeNull();
});
it("keeps selection visible but disabled while preferences are pending", async () => {
  setup();
  jest
    .mocked(useTrainingDefaults)
    .mockReturnValue({
      unit: "kg",
      restSeconds: 120,
      pending: true,
      error: "",
      retry: jest.fn(),
    });
  await render(wrap(<ExercisePickerScreen target="workout" />));
  await fireEvent.press(
    await screen.findByRole("button", { name: "Bench press" }),
  );
  expect(screen.getByText("Loading training preferences…")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Add 1 exercises" }),
  ).toBeDisabled();
});
