import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTraining } from "@/features/training";
import { makeRoutine, makeSession } from "../../../tests/fixtures/training";
import { TrainScreen } from "./TrainScreen";
import { ResumeStrip } from "./ResumeStrip";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
const start = jest.fn(),
  retry = jest.fn(),
  routines = jest.fn();
function setup(overrides: Record<string, unknown> = {}) {
  jest
    .mocked(useTraining)
    .mockReturnValue({
      api: { routines },
      start,
      retry,
      session: null,
      status: "saved",
      error: "",
      ...overrides,
    } as unknown as ReturnType<typeof useTraining>);
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <TrainScreen />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  routines.mockResolvedValue([]);
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
