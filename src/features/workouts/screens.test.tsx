import { Alert } from "react-native";
import type { TrainingSession } from "@/domain/training";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  makeSession,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
import { WorkoutScreen } from "./WorkoutScreen";
import { FinishScreen } from "./FinishScreen";
import { SummaryScreen } from "./SummaryScreen";
import { RecoveryControls } from "./RecoveryControls";
import { SessionDetails } from "../history/SessionDetails";
import { HistoryScreen } from "../history/HistoryScreen";
import { WorkoutDetailScreen } from "../history/WorkoutDetailScreen";
import { editedSet, moved } from "./fields";
const mockCommand = jest.fn().mockResolvedValue(undefined);
const mockSetRaw = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "10000000-0000-4000-8000-000000000100",
}));
const exercise = {
  id: trainingId(2),
  exercise_id: trainingId(9),
  position: 0,
  name: "Bench",
  load_convention: "Total load",
  load_mode: "external" as const,
  notes: "",
  rest_seconds: 120,
  sets: [makeSet()],
};
const session: TrainingSession = { ...makeSession(), exercises: [exercise] };
const mockTraining = {
  session,
  savedSession: session,
  api: {
    previous: jest.fn().mockResolvedValue(null),
    history: jest.fn().mockResolvedValue({ items: [], next_cursor: null }),
    workout: jest.fn().mockResolvedValue({
      ...session,
      status: "completed",
      finished_at: "2026-10-27T13:00:00Z",
    }),
  },
  status: "saved",
  error: "",
  raw: {} as Record<string, string>,
  pending: 0,
  hasLocalChanges: false,
  timerDeadline: null as number | null,
  command: mockCommand,
  setRaw: mockSetRaw,
  retry: jest.fn().mockResolvedValue(undefined),
  reviewConflict: jest.fn().mockResolvedValue(undefined),
  reapply: jest.fn().mockResolvedValue(undefined),
  discardPending: jest.fn().mockResolvedValue(undefined),
  extendRest: jest.fn().mockResolvedValue(undefined),
  restartRest: jest.fn().mockResolvedValue(undefined),
  skipRest: jest.fn().mockResolvedValue(undefined),
  finish: jest.fn().mockResolvedValue(session),
  cancel: jest.fn().mockResolvedValue(session),
};
jest.mock("@/features/training", () => ({ useTraining: () => mockTraining }));
async function mount(child: React.ReactNode) {
  const view = await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      {child}
    </QueryClientProvider>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.status = "saved";
  mockTraining.raw = {};
  mockTraining.timerDeadline = null;
  mockTraining.session = session;
});
it("validates raw set input without replacing partial decimals", async () => {
  expect(editedSet(makeSet(), "external", "72.", "8")).toBeNull();
  expect(editedSet(makeSet(), "external", "72", "0")).toBeNull();
  expect(editedSet(makeSet(), "bodyweight", "", "")).toMatchObject({
    entered_load: null,
    reps: null,
  });
  expect(editedSet(makeSet(), "external", "", "8")).toMatchObject({
    entered_load: null,
    reps: 8,
  });
  expect(moved(["a", "b"], 1, -1)).toEqual(["b", "a"]);
  expect(moved(["a"], 0, -1)).toEqual(["a"]);
  expect(moved(["a"], 1, -1)).toEqual(["a"]);
});
it("renders workout and completes latest valid fields", async () => {
  await mount(<WorkoutScreen />);
  await waitFor(() => expect(screen.getByText("Previous: —")).toBeTruthy());
  await fireEvent.changeText(
    screen.getByLabelText("Bench set 1 Weight (kg)"),
    "72.5",
  );
  expect(
    screen.getByRole("button", { name: "Bench set 1: Complete set" }),
  ).toHaveStyle({ minHeight: 50 });
  expect(screen.getByText("Done")).toBeTruthy();
  await fireEvent.press(screen.getByText("Done"));
  await waitFor(() =>
    expect(mockCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: "complete_set" }),
    ),
  );
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "upsert_set",
      set: expect.objectContaining({ entered_load: "72.5" }),
    }),
  );
  await fireEvent.press(screen.getByText("Add exercise"));
  expect(mockPush).toHaveBeenCalledWith("/exercise-picker?target=workout");
});
it("keeps invalid inputs incomplete and supports structural edits", async () => {
  await mount(<WorkoutScreen />);
  await fireEvent.changeText(screen.getByLabelText("Bench set 1 reps"), "0");
  await fireEvent.press(screen.getByText("Done"));
  expect(
    screen.getByText("Enter a complete valid load and reps."),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText("Add set"));
  await fireEvent.press(screen.getByText("Set options"));
  await fireEvent.press(screen.getByText("Remove set"));
  await fireEvent.press(screen.getByText("Remove exercise"));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({ type: "remove_exercise" }),
  );
});
it("updates notes and validates rest", async () => {
  await mount(<WorkoutScreen />);
  const notes = screen.getByLabelText("Bench notes");
  await fireEvent.changeText(notes, "Slow");
  await fireEvent(notes, "blur");
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({ notes: "Slow" }),
  );
  const rest = screen.getByLabelText("Bench rest seconds");
  await fireEvent.changeText(rest, "2");
  await fireEvent(rest, "blur");
  expect(screen.getByText("Rest must be 15–3600 seconds.")).toBeTruthy();
});
it("requires acknowledged completed rows before finish", async () => {
  await mount(<FinishScreen />);
  expect(screen.getByText("Finish and save")).toBeDisabled();
});
it("finishes acknowledged completed workout", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        sets: [{ ...makeSet(), completed_at: "2026-10-27T12:05:00Z" }],
      },
    ],
  };
  await mount(<FinishScreen />);
  await fireEvent.press(screen.getByText("Finish and save"));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
});
it("renders recovery and timestamp timer controls", async () => {
  mockTraining.status = "error";
  mockTraining.error = "Offline";
  mockTraining.timerDeadline = Date.now() + 30000;
  await mount(<RecoveryControls />);
  await fireEvent.press(screen.getByText("Retry changes"));
  await fireEvent.press(screen.getByText("Add 30 seconds"));
  await fireEvent.press(screen.getByText("Skip rest"));
  expect(mockTraining.retry).toHaveBeenCalled();
  expect(mockTraining.extendRest).toHaveBeenCalledWith(30);
  expect(mockTraining.skipRest).toHaveBeenCalled();
});
it("renders conflict choices", async () => {
  mockTraining.status = "conflict";
  await mount(<RecoveryControls />);
  await fireEvent.press(screen.getByText("Review server version"));
  expect(mockTraining.reviewConflict).toHaveBeenCalled();
  expect(screen.getByText("Reapply my changes")).toBeTruthy();
});
it("shows actual summary and snapshot details", async () => {
  await mount(<SummaryScreen id={session.id} />);
  await waitFor(() =>
    expect(screen.getByText("0 working sets · 60 minutes")).toBeTruthy(),
  );
  expect(screen.getByText("Workout saved")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
});
it("shows history empty state and refresh", async () => {
  await mount(<HistoryScreen />);
  await waitFor(() =>
    expect(
      screen.getByText("Your completed workouts will appear here."),
    ).toBeTruthy(),
  );
  await act(async () => {
    await fireEvent.press(screen.getByText("Refresh history"));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
});
it("shows completed history detail", async () => {
  await mount(<WorkoutDetailScreen id={session.id} />);
  await waitFor(() =>
    expect(screen.getByText("Bench · external")).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});
it("counts completed working load and preserves units", async () => {
  await mount(
    <SessionDetails
      session={{
        ...session,
        finished_at: "2026-10-27T12:10:00Z",
        exercises: [
          {
            ...exercise,
            sets: [{ ...makeSet(), completed_at: "2026-10-27T12:01:00Z" }],
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("1 working sets · 10 minutes")).toBeTruthy();
  expect(
    screen.getByText("480 kg eligible volume (external and added load)"),
  ).toBeTruthy();
});
it("shows timed and distance history without adding it to strength volume", async () => {
  await mount(
    <SessionDetails
      session={{
        ...session,
        exercises: [
          {
            ...exercise,
            tracking_type: "distance_duration",
            sets: [
              {
                ...makeSet(),
                duration_seconds: 600,
                entered_distance: "1.250",
                distance_unit: "mi",
                completed_at: "2026-10-27T12:01:00Z",
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("Bench · Duration and distance")).toBeTruthy();
  expect(screen.getByText(/600 seconds · 1.250 mi/)).toBeTruthy();
  expect(
    screen.getByText("0 kg eligible volume (external and added load)"),
  ).toBeTruthy();
});
it("records duration and distance in a timed workout set", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        tracking_type: "distance_duration",
        sets: [{ ...makeSet(), reps: null, entered_load: null }],
      },
    ],
  };
  await mount(<WorkoutScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Bench set 1 duration seconds"),
    "600",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Bench set 1 distance"),
    "1.25",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bench set 1: Complete set" }),
  );
  await waitFor(() =>
    expect(mockCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "upsert_set",
        set: expect.objectContaining({
          duration_seconds: 600,
          entered_distance: "1.25",
          distance_unit: "km",
        }),
      }),
    ),
  );
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({ type: "complete_set", completed: true }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bench set 1: Make warm-up" }),
  );
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "upsert_set",
      set: expect.objectContaining({
        set_type: "warmup",
        duration_seconds: 600,
        entered_distance: "1.25",
      }),
    }),
  );
});
it("shows previous timed performance and validates required measurements", async () => {
  mockTraining.api.previous.mockResolvedValueOnce({
    session_id: trainingId(1),
    finished_at: "2026-10-27T12:01:00Z",
    sets: [
      {
        set_type: "working",
        ordinal: 0,
        entered_load: null,
        entered_unit: "kg",
        reps: null,
        duration_seconds: 90,
        entered_distance: "0.5",
        distance_unit: "mi",
      },
    ],
  });
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        tracking_type: "distance_duration",
        sets: [{ ...makeSet(), reps: null, entered_load: null }],
      },
    ],
  };
  await mount(<WorkoutScreen />);
  await waitFor(() =>
    expect(screen.getByText("Previous: 90 seconds · 0.5 mi")).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Bench set 1: Complete set" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter the required duration and distance.",
  );
  expect(mockCommand).not.toHaveBeenCalled();
});
it("does not change distance units after text is entered before the draft rerenders", async () => {
  mockTraining.session = {
    ...session,
    exercises: [{ ...exercise, tracking_type: "distance_duration", sets: [{ ...makeSet(), reps: null, entered_load: null }] }],
  };
  await mount(<WorkoutScreen />);
  await fireEvent.changeText(screen.getByLabelText("Bench set 1 distance"), "5");
  await fireEvent.press(screen.getByRole("button", { name: "Bench set 1 distance unit" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Clear distance to change its unit.");
  expect(mockCommand).not.toHaveBeenCalled();
});
it("edits type, unit, ordering and workout name without completing", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      { ...exercise, position: 1, sets: [{ ...makeSet(), position: 1 }] },
    ],
  };
  await mount(<WorkoutScreen />);
  await fireEvent.press(screen.getByText("Set options"));
  await fireEvent.press(screen.getByText("Make warm-up"));
  await fireEvent.press(screen.getByText("View in lb"));
  const load = screen.getByLabelText("Bench set 1 Weight (kg)");
  await fireEvent(load, "blur");
  const name = screen.getByLabelText("Workout name");
  await fireEvent.changeText(name, "Strength");
  await fireEvent(name, "blur");
  expect(mockCommand).toHaveBeenCalledWith({
    type: "rename_workout",
    name: "Strength",
  });
  await fireEvent.press(screen.getByText("Finish"));
  expect(mockPush).toHaveBeenCalledWith("/workout/finish");
});
it("retains raw failure and shows command failure without completing", async () => {
  mockSetRaw.mockRejectedValueOnce(new Error("disk"));
  mockCommand.mockRejectedValueOnce(new Error("offline"));
  await mount(<WorkoutScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Bench set 1 Weight (kg)"),
    "72",
  );
  await waitFor(() =>
    expect(screen.getByText("Could not preserve input. Retry.")).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText("Done"));
  await waitFor(() =>
    expect(
      screen.getByText("Change is pending. Use Retry above."),
    ).toBeTruthy(),
  );
});
it("renders bodyweight without a weight input and toggles completion", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        load_mode: "bodyweight",
        sets: [
          {
            ...makeSet(),
            entered_load: null,
            completed_at: "2026-10-27T12:00:00Z",
          },
        ],
      },
    ],
  };
  await mount(<WorkoutScreen />);
  expect(screen.queryByLabelText("Bench set 1 Weight (kg)")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Bench set 1: Mark incomplete" }),
  ).toHaveStyle({ minHeight: 50 });
  expect(screen.getByText("Undo")).toBeTruthy();
  await fireEvent.press(screen.getByText("Undo"));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({ completed: false }),
  );
});
it("shows previous and repeated ordinal, with warmup distinctions", async () => {
  mockTraining.api.previous.mockResolvedValueOnce({
    session_id: session.id,
    finished_at: "2026-10-26T12:00:00Z",
    sets: [
      {
        set_type: "working",
        ordinal: 0,
        entered_load: "55",
        entered_unit: "lb",
        reps: 10,
      },
    ],
  });
  await mount(<WorkoutScreen />);
  await waitFor(() =>
    expect(screen.getByText("Previous: 55 lb × 10")).toBeTruthy(),
  );
});
it("shows query errors and retries for previous, detail and history", async () => {
  mockTraining.api.previous.mockRejectedValueOnce(new Error("offline"));
  const view = await mount(<WorkoutScreen />);
  await waitFor(() => expect(screen.getByText("Retry previous")).toBeTruthy());
  await fireEvent.press(screen.getByText("Retry previous"));
  await view.unmount();
  mockTraining.api.workout.mockRejectedValueOnce(new Error("offline"));
  const detail = await mount(<WorkoutDetailScreen id={session.id} />);
  await waitFor(() => expect(screen.getByText("Retry workout")).toBeTruthy());
  await fireEvent.press(screen.getByText("Retry workout"));
  await detail.unmount();
  mockTraining.api.history.mockRejectedValueOnce(new Error("offline"));
  await mount(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText("Retry history")).toBeTruthy());
  await fireEvent.press(screen.getByText("Retry history"));
});
it("pages and opens actual completed history records", async () => {
  mockTraining.api.history.mockResolvedValueOnce({
    items: [
      { ...session, status: "completed", finished_at: "2026-10-27T13:00:00Z" },
    ],
    next_cursor: { finished_at: "2026-10-27T13:00:00Z", id: session.id },
  });
  await mount(<HistoryScreen />);
  await waitFor(() =>
    expect(screen.getByText("Load more workouts")).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText("Workout"));
  expect(mockPush).toHaveBeenCalledWith(`/history-detail?id=${session.id}`);
  await fireEvent.press(screen.getByText("Load more workouts"));
});
it("does not confirm saved when finish fails", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        sets: [{ ...makeSet(), completed_at: "2026-10-27T12:00:00Z" }],
      },
    ],
  };
  mockTraining.finish.mockRejectedValueOnce(new Error("offline"));
  await mount(<FinishScreen />);
  await fireEvent.press(screen.getByText("Finish and save"));
  await waitFor(() =>
    expect(
      screen.getByText(
        "Workout is not confirmed saved. Retry when all changes are saved.",
      ),
    ).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText("Return to workout"));
});
it("renders loading/terminal screen and excludes assistance and warmup from volume", async () => {
  mockTraining.session = { ...session, status: "completed" };
  mockTraining.status = "loading";
  const view = await mount(<WorkoutScreen />);
  expect(screen.queryByText("Add exercise")).toBeNull();
  await view.unmount();
  await mount(
    <SessionDetails
      session={{
        ...session,
        exercises: [
          {
            ...exercise,
            load_mode: "assisted",
            notes: "Slow",
            sets: [
              {
                ...makeSet(),
                completed_at: "2026-10-27T12:01:00Z",
                set_type: "warmup",
              },
              {
                ...makeSet(),
                id: trainingId(5),
                completed_at: "2026-10-27T12:02:00Z",
                entered_load: "20",
                entered_unit: "lb",
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(
    screen.getByText("0 kg eligible volume (external and added load)"),
  ).toBeTruthy();
});
it("requires explicit conflict/cancel confirmations and handles failures", async () => {
  const alert = jest
    .spyOn(Alert, "alert")
    .mockImplementation((_title, _message, buttons) => {
      buttons?.at(-1)?.onPress?.();
    });
  mockTraining.status = "conflict";
  mockTraining.reapply.mockRejectedValueOnce(new Error("offline"));
  const recovery = await mount(<RecoveryControls />);
  await fireEvent.press(screen.getByText("Reapply my changes"));
  await fireEvent.press(screen.getByText("Discard my pending changes"));
  expect(mockTraining.discardPending).toHaveBeenCalled();
  await recovery.unmount();
  mockTraining.status = "saved";
  await mount(<WorkoutScreen />);
  await fireEvent.press(screen.getByText("Cancel workout"));
  await waitFor(() => expect(mockTraining.cancel).toHaveBeenCalled());
  alert.mockRestore();
});
it("moves a later exercise and set and reports detail save failures", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      { ...exercise, id: trainingId(40), name: "First", sets: [] },
      {
        ...exercise,
        sets: [
          { ...makeSet(), id: trainingId(41) },
          { ...makeSet(), position: 1 },
        ],
      },
    ],
  };
  await mount(<WorkoutScreen />);
  const moveExercises = screen.getAllByText("Move exercise up");
  const secondExercise = moveExercises[1];
  if (!secondExercise) throw new Error("Missing later exercise");
  await fireEvent.press(secondExercise);
  for (const options of screen.getAllByText("Set options"))
    await fireEvent.press(options);
  const moveSets = screen.getAllByText("Move set up");
  const secondSet = moveSets[1];
  if (!secondSet) throw new Error("Missing later set");
  await fireEvent.press(secondSet);
  mockCommand.mockRejectedValueOnce(new Error("offline"));
  const notes = screen.getByLabelText("Bench notes");
  await fireEvent.changeText(notes, "Pause");
  await fireEvent(notes, "blur");
  await waitFor(() =>
    expect(
      screen.getByText("Change is pending. Use Retry above."),
    ).toBeTruthy(),
  );
});
it("reviews and explicitly removes unfinished sets and empty exercises", async () => {
  const alert = jest
    .spyOn(Alert, "alert")
    .mockImplementation((_title, _message, buttons) =>
      buttons?.at(-1)?.onPress?.(),
    );
  const view = await mount(<FinishScreen />);
  await fireEvent.press(screen.getByText("Remove unfinished Bench set 1"));
  expect(mockCommand).toHaveBeenCalledWith(
    expect.objectContaining({ type: "remove_set" }),
  );
  await view.unmount();
  mockTraining.session = { ...session, exercises: [{ ...exercise, sets: [] }] };
  mockCommand.mockRejectedValueOnce(new Error("offline"));
  await mount(<FinishScreen />);
  await fireEvent.press(screen.getByText("Remove empty Bench"));
  await waitFor(() =>
    expect(screen.getByText("Removal is pending. Retry changes.")).toBeTruthy(),
  );
  alert.mockRestore();
});
it("renders bodyweight previous and noncompleted detail without a saved claim", async () => {
  mockTraining.api.workout.mockResolvedValueOnce(session);
  const detail = await mount(<WorkoutDetailScreen id={session.id} summary />);
  await waitFor(() =>
    expect(
      screen.getByText("This workout has not been completed."),
    ).toBeTruthy(),
  );
  expect(screen.queryByText("Workout saved")).toBeNull();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  await detail.unmount();
  mockTraining.api.previous.mockResolvedValueOnce({
    session_id: session.id,
    finished_at: "2026-10-26T12:00:00Z",
    sets: [
      {
        set_type: "working",
        ordinal: 0,
        entered_load: null,
        entered_unit: "kg",
        reps: 5,
      },
    ],
  });
  await mount(<WorkoutScreen />);
  await waitFor(() =>
    expect(screen.getByText("Previous: Bodyweight  × 5")).toBeTruthy(),
  );
});
it("adjusts and restarts rest using validated seconds", async () => {
  mockTraining.timerDeadline = Date.now() + 30000;
  await mount(<RecoveryControls />);
  await fireEvent.press(screen.getByText("Adjust rest"));
  const input = screen.getByLabelText("Rest duration seconds");
  await fireEvent.changeText(input, "2");
  await fireEvent.press(screen.getByText("Restart timer"));
  expect(screen.getByText("Enter 15–3600 seconds.")).toBeTruthy();
  await fireEvent.changeText(input, "90");
  await fireEvent.press(screen.getByText("Restart timer"));
  await waitFor(() =>
    expect(mockTraining.restartRest).toHaveBeenCalledWith(90),
  );
});
it("preserves timer settings on restart failure and allows closing sheet", async () => {
  mockTraining.timerDeadline = Date.now() + 30000;
  mockTraining.restartRest.mockRejectedValueOnce(new Error("disk"));
  await mount(<RecoveryControls />);
  await fireEvent.press(screen.getByText("Adjust rest"));
  const input = screen.getByLabelText("Rest duration seconds");
  await fireEvent.changeText(input, "oops");
  await fireEvent.press(screen.getByText("Restart timer"));
  await fireEvent.changeText(input, "3601");
  await fireEvent.press(screen.getByText("Restart timer"));
  await fireEvent.changeText(input, "120");
  await fireEvent.press(screen.getByText("Restart timer"));
  await waitFor(() =>
    expect(screen.getByText("Could not update rest. Retry.")).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText("Close rest settings"));
  expect(screen.queryByText("Restart timer")).toBeNull();
});
it("groups completed sessions by their recorded local day", async () => {
  mockTraining.api.history.mockResolvedValueOnce({
    items: [
      { ...session, status: "completed", finished_at: "2026-10-27T13:00:00Z" },
      {
        ...session,
        id: trainingId(80),
        name: "Evening",
        status: "completed",
        finished_at: "2026-10-27T17:00:00Z",
      },
    ],
    next_cursor: null,
  });
  await mount(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText("Evening")).toBeTruthy());
  expect(screen.getAllByText("October 27, 2026")).toHaveLength(1);
});
it("keeps Finish outside scrolling rows and exposes numeric keyboard controls", async () => {
  await mount(<WorkoutScreen />);
  expect(screen.getByText("Finish")).toBeTruthy();
  expect(screen.queryByText("Remove set")).toBeNull();
  const load = screen.getByLabelText("Bench set 1 Weight (kg)");
  await fireEvent(load, "focus");
  expect(screen.getByText("Next: reps")).toBeTruthy();
  await fireEvent.press(screen.getByText("Next: reps"));
  await fireEvent(screen.getByLabelText("Bench set 1 reps"), "focus");
  expect(screen.queryByText("Next: reps")).toBeNull();
  await fireEvent.press(screen.getByText("Done editing set"));
  expect(screen.queryByText("Done editing set")).toBeNull();
  await fireEvent.press(screen.getByText("Set options"));
  expect(screen.getByText("Remove set")).toBeTruthy();
  await fireEvent.press(screen.getByText("Hide set options"));
  expect(screen.queryByText("Remove set")).toBeNull();
});
it("clears per-row keyboard controls on blur and preserves load-to-reps focus", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      {
        ...exercise,
        sets: [makeSet(), { ...makeSet(), id: trainingId(33), position: 1 }],
      },
    ],
  };
  await mount(<WorkoutScreen />);
  for (const ordinal of [1, 2])
    expect(
      screen.getByRole("button", {
        name: `Bench set ${ordinal}: Complete set`,
      }),
    ).toBeTruthy();
  const load = screen.getByLabelText("Bench set 1 Weight (kg)");
  const reps = screen.getByLabelText("Bench set 1 reps");
  await fireEvent(load, "focus");
  expect(
    screen.getByRole("button", { name: "Bench set 1: Next, reps" }),
  ).toBeTruthy();
  // Native focus/blur events can arrive in either order during a field transition.
  await fireEvent(reps, "focus");
  await fireEvent(load, "blur");
  expect(
    screen.getByRole("button", { name: "Bench set 1: Done editing set" }),
  ).toBeTruthy();
  await fireEvent(reps, "blur");
  await fireEvent(screen.getByLabelText("Bench set 2 reps"), "focus");
  expect(
    screen.queryByRole("button", { name: "Bench set 1: Done editing set" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Bench set 2: Done editing set" }),
  ).toBeTruthy();
});
it("identifies set actions across exercises without verbose visible labels", async () => {
  mockTraining.session = {
    ...session,
    exercises: [
      exercise,
      { ...exercise, id: trainingId(44), name: "Squat", position: 1 },
    ],
  };
  await mount(<WorkoutScreen />);
  for (const name of ["Bench", "Squat"]) {
    expect(
      screen.getByRole("button", { name: `${name} set 1: Complete set` }),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: `${name} set 1: Set options` }),
    );
    for (const action of [
      "Make warm-up",
      "Move set up",
      "Remove set",
      "View in lb",
    ]) {
      expect(
        screen.getByRole("button", { name: `${name} set 1: ${action}` }),
      ).toBeTruthy();
    }
  }
});
