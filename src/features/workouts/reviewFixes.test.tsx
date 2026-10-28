import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTraining } from "@/features/training";
import {
  makeSession,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
import { FinishScreen } from "./FinishScreen";
import { RecoveryControls } from "./RecoveryControls";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));
function training(overrides: Record<string, unknown> = {}) {
  const session = {
    ...makeSession(),
    exercises: [
      {
        id: trainingId(8),
        exercise_id: trainingId(9),
        name: "Bench",
        load_mode: "external" as const,
        load_convention: "Total",
        position: 0,
        notes: "",
        rest_seconds: 120,
        sets: [{ ...makeSet(), completed_at: "2026-10-27T12:00:00Z" }],
      },
    ],
  };
  const finish = jest
    .fn()
    .mockResolvedValue({ ...session, status: "completed" });
  jest.mocked(useTraining).mockReturnValue({
    session,
    status: "saved",
    hasLocalChanges: false,
    timerDeadline: null,
    finish,
    ...overrides,
  } as unknown as ReturnType<typeof useTraining>);
  return finish;
}
beforeEach(() => jest.clearAllMocks());
it("never calls a local-only draft saved", async () => {
  training({ hasLocalChanges: true });
  await render(<RecoveryControls />);
  expect(
    screen.getByText("Changes kept on this device · not saved yet"),
  ).toBeVisible();
  expect(screen.queryByText("Saved")).toBeNull();
});
it("invalidates performance/history caches only after acknowledged finish", async () => {
  const finish = training();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  await render(
    <QueryClientProvider client={client}>
      <FinishScreen />
    </QueryClientProvider>,
  );
  expect(invalidate).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Finish and save" }),
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith(
      `/workout/summary?id=${trainingId(1)}`,
    ),
  );
  for (const key of [
    "history",
    "previous",
    "exercise-previous",
    "exercise-history",
  ])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
  expect(finish).toHaveBeenCalledTimes(1);
});
it("does not invalidate or navigate when finish was not acknowledged", async () => {
  const finish = training();
  finish.mockRejectedValueOnce(Error("offline"));
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  await render(
    <QueryClientProvider client={client}>
      <FinishScreen />
    </QueryClientProvider>,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Finish and save" }),
  );
  await screen.findByText(
    "Workout is not confirmed saved. Retry when all changes are saved.",
  );
  expect(invalidate).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});
it("distinguishes a server write in progress from locally kept drafts", async () => {
  training({ status: "saving", hasLocalChanges: true });
  await render(<RecoveryControls />);
  expect(screen.getByText("Saving…")).toBeVisible();
  expect(screen.queryByText("Saved")).toBeNull();
});
