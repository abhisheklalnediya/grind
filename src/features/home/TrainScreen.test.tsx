import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { makeRoutine, makeSession } from "../../../tests/fixtures/training";
import { TrainScreen } from "./TrainScreen";
import { ResumeStrip } from "./ResumeStrip";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
jest.mock("@/theme/useTheme", () => ({ useTheme: jest.fn() }));
const start = jest.fn(),
  retry = jest.fn(),
  routines = jest.fn(),
  history = jest.fn();
function setup(
  overrides: Record<string, unknown> = {},
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  }),
) {
  const scope =
    typeof overrides.scope === "string" ? overrides.scope : "account-a";
  const trainingOverrides = { ...overrides };
  delete trainingOverrides.scope;
  jest.mocked(useTheme).mockReturnValue({
    scope,
    colors: { text: "black", secondary: "gray", error: "red" },
  } as ReturnType<typeof useTheme>);
  jest.mocked(useTraining).mockReturnValue({
    api: { routines, history },
    start,
    retry,
    session: null,
    status: "saved",
    error: "",
    ...trainingOverrides,
  } as unknown as ReturnType<typeof useTraining>);
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainScreen />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  routines.mockResolvedValue([]);
  history.mockResolvedValue({ items: [], next_cursor: null });
  start.mockResolvedValue(makeSession());
  retry.mockResolvedValue(undefined);
});
it("starts an empty workout and navigates routines/history", async () => {
  await setup();
  await screen.findByText("Save a routine to repeat your favourite session.");
  await fireEvent.press(
    screen.getByRole("button", { name: "Start empty workout" }),
  );
  expect(start).toHaveBeenCalledWith(null);
  expect(router.push).toHaveBeenCalledWith("/workout");
  await fireEvent.press(screen.getByRole("button", { name: "Create routine" }));
  expect(router.push).toHaveBeenCalledWith("/routine-edit");
  await fireEvent.press(
    screen.getByRole("button", { name: "View completed workouts" }),
  );
  expect(router.push).toHaveBeenCalledWith("/(tabs)/history");
});
it("shows acknowledged routines, resumes active workout and retries recovery", async () => {
  const routine = makeRoutine();
  routines.mockResolvedValue([routine]);
  await setup({ session: makeSession(), error: "Connection lost" });
  await fireEvent.press(
    await screen.findByRole("button", { name: routine.name }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/routine",
    params: { id: routine.id },
  });
  await fireEvent.press(screen.getByRole("button", { name: /Resume/ }));
  expect(router.push).toHaveBeenCalledWith("/workout");
  await fireEvent.press(
    screen.getByRole("button", { name: "Retry workout recovery" }),
  );
  expect(retry).toHaveBeenCalled();
});
it("handles start and routine failures with retry", async () => {
  routines.mockRejectedValueOnce(Error("offline"));
  start.mockRejectedValueOnce(Error("offline"));
  await setup();
  await fireEvent.press(
    await screen.findByRole("button", { name: "Retry routines" }),
  );
  await screen.findByText("Save a routine to repeat your favourite session.");
  await fireEvent.press(
    screen.getByRole("button", { name: "Start empty workout" }),
  );
  await waitFor(() =>
    expect(screen.getByText(/Couldn’t open your workout/)).toBeVisible(),
  );
});
it("keeps signed-out queries disabled and renders only active resume", async () => {
  await setup({ api: null, status: "loading" });
  expect(routines).not.toHaveBeenCalled();
  expect(history).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Start empty workout" }),
  ).toBeDisabled();
  const strip = await render(<ResumeStrip />);
  expect(screen.queryByRole("button", { name: /Resume/ })).toBeNull();
  jest
    .mocked(useTraining)
    .mockReturnValue({ session: makeSession() } as ReturnType<
      typeof useTraining
    >);
  await strip.rerender(<ResumeStrip />);
  await fireEvent.press(screen.getByRole("button", { name: /Resume/ }));
  expect(router.push).toHaveBeenCalledWith("/workout");
});

it("shows a bounded recent list and opens the selected history detail", async () => {
  const sessions = Array.from({ length: 6 }, (_, index) => ({
    ...makeSession(),
    id: `workout-${index}`,
    name: `Session ${index}`,
    status: "completed" as const,
    finished_at: "2026-10-26T20:30:00.000Z",
    timezone: "Asia/Kolkata",
  }));
  history.mockResolvedValue({ items: sessions, next_cursor: null });
  await setup();
  const first = await screen.findByRole("button", {
    name: /Session 0 · Oct 27, 2026/,
  });
  expect(screen.getByRole("button", { name: /Session 4 ·/ })).toBeVisible();
  expect(screen.queryByRole("button", { name: /Session 5 ·/ })).toBeNull();
  await fireEvent.press(first);
  expect(router.push).toHaveBeenCalledWith("/history-detail?id=workout-0");
  expect(history).toHaveBeenCalledWith(null);
});

it("shows recent-workout loading, error/retry, and empty states", async () => {
  let resolveHistory: (value: {
    items: [];
    next_cursor: null;
  }) => void = () => {};
  history.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveHistory = resolve;
    }),
  );
  await setup();
  expect(screen.getByText("Loading recent workouts…")).toBeVisible();
  resolveHistory({ items: [], next_cursor: null });
  expect(
    await screen.findByText("Completed workouts will appear here."),
  ).toBeVisible();
  history.mockRejectedValueOnce(Error("offline"));
  const view = await setup();
  await screen.findByRole("button", { name: "Retry recent workouts" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Retry recent workouts" }),
  );
  expect(
    await screen.findByText("Completed workouts will appear here."),
  ).toBeVisible();
  view.unmount();
});

it("scopes recent history cache by account", async () => {
  const sessionA = {
    ...makeSession(),
    id: "account-a-workout",
    name: "Account A workout",
    status: "completed" as const,
    finished_at: "2026-10-27T00:30:00.000Z",
    timezone: "Asia/Kolkata",
  };
  const sessionB = {
    ...sessionA,
    id: "account-b-workout",
    name: "Account B workout",
  };
  history.mockResolvedValueOnce({ items: [sessionA], next_cursor: null });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await setup({}, queryClient);
  expect(
    await screen.findByRole("button", { name: /Account A workout/ }),
  ).toBeVisible();
  let resolveAccountB: (value: {
    items: (typeof sessionB)[];
    next_cursor: null;
  }) => void = () => {};
  history.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveAccountB = resolve;
    }),
  );
  jest.mocked(useTheme).mockReturnValue({
    scope: "account-b",
    colors: { text: "black", secondary: "gray", error: "red" },
  } as ReturnType<typeof useTheme>);
  await act(async () => {
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <TrainScreen />
      </QueryClientProvider>,
    );
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: /Account A workout/ }),
    ).toBeNull(),
  );
  expect(screen.getByText("Loading recent workouts…")).toBeVisible();
  expect(history).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolveAccountB({ items: [sessionB], next_cursor: null });
  });
  expect(
    await screen.findByRole("button", { name: /Account B workout/ }),
  ).toBeVisible();
  view.unmount();
});
