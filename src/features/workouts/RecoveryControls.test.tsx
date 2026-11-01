import { Alert, Text } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useTraining } from "@/features/training";
import { RecoveryControls } from "./RecoveryControls";

jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));

const mockTraining = {
  session: null as { name: string } | null,
  status: "saved",
  error: "",
  hasLocalChanges: false,
  timerDeadline: null as number | null,
  retry: jest.fn().mockResolvedValue(undefined),
  reviewConflict: jest.fn().mockResolvedValue(undefined),
  reapply: jest.fn().mockResolvedValue(undefined),
  discardPending: jest.fn().mockResolvedValue(undefined),
  extendRest: jest.fn().mockResolvedValue(undefined),
  restartRest: jest.fn().mockResolvedValue(undefined),
  skipRest: jest.fn().mockResolvedValue(undefined),
};
const reviewedMessage = "Review changes, then reapply or discard your local edits.";

beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.session = null;
  mockTraining.status = "saved";
  mockTraining.error = "";
  mockTraining.hasLocalChanges = false;
  mockTraining.timerDeadline = null;
  mockTraining.retry.mockResolvedValue(undefined);
  mockTraining.reviewConflict.mockImplementation(async () => {
    mockTraining.error = reviewedMessage;
  });
  mockTraining.reapply.mockResolvedValue(undefined);
  mockTraining.discardPending.mockResolvedValue(undefined);
  mockTraining.extendRest.mockResolvedValue(undefined);
  mockTraining.restartRest.mockResolvedValue(undefined);
  mockTraining.skipRest.mockResolvedValue(undefined);
  jest.mocked(useTraining).mockReturnValue(
    mockTraining as unknown as ReturnType<typeof useTraining>,
  );
});

function ServerVersionProbe() {
  const training = useTraining();
  return training.session ? <Text>{training.session.name}</Text> : null;
}

it("keeps the saved summary compact while exposing timer controls without live announcements", async () => {
  mockTraining.timerDeadline = Date.now() + 30_000;
  await render(<RecoveryControls />);

  expect(screen.getByText("Saved")).toBeVisible();
  expect(screen.getByText(/Rest · \d+s/).props.accessibilityLiveRegion).toBe(
    undefined,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add 30 seconds" }));
  await fireEvent.press(screen.getByRole("button", { name: "Skip rest" }));
  expect(mockTraining.extendRest).toHaveBeenCalledWith(30);
  expect(mockTraining.skipRest).toHaveBeenCalledTimes(1);
});

it("starts the countdown from the deadline when a timer becomes active after idle", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-31T10:00:00Z"));
  const view = await render(<RecoveryControls />);
  jest.setSystemTime(new Date("2026-10-31T10:05:00Z"));
  mockTraining.timerDeadline = Date.now() + 30_000;
  await view.rerender(<RecoveryControls />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });

  expect(screen.getByText("Rest · 30s")).toBeVisible();
  view.unmount();
  jest.useRealTimers();
});

it("announces rest completion once per deadline, without announcing each tick", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-31T10:00:00Z"));
  mockTraining.timerDeadline = Date.now() + 1000;
  const view = await render(<RecoveryControls />);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(screen.getAllByText("Rest timer finished.")).toHaveLength(1);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5000);
  });
  expect(screen.getAllByText("Rest timer finished.")).toHaveLength(1);

  mockTraining.timerDeadline = Date.now() + 1000;
  await view.rerender(<RecoveryControls />);
  expect(screen.queryByText("Rest timer finished.")).toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(screen.getAllByText("Rest timer finished.")).toHaveLength(1);
  view.unmount();
  jest.useRealTimers();
});

it("keeps retry available in the summary and reports local drafts honestly", async () => {
  mockTraining.status = "error";
  mockTraining.error = "Offline";
  mockTraining.hasLocalChanges = true;
  await render(<RecoveryControls />);

  expect(screen.getByText("Offline")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Retry changes" }),
  ).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Retry changes" }));
  expect(mockTraining.retry).toHaveBeenCalledTimes(1);
});

it("preserves explicit conflict review and confirmation before reapply or discard", async () => {
  mockTraining.status = "conflict";
  let completeReview: (() => void) | undefined;
  mockTraining.reviewConflict.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        completeReview = () => {
          mockTraining.session = { name: "Server workout version" };
          mockTraining.error = reviewedMessage;
          resolve();
        };
      }),
  );
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = await render(
    <>
      <RecoveryControls />
      <ServerVersionProbe />
    </>,
  );

  expect(screen.queryByText("Reapply my changes")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Review server version" }),
  );
  expect(
    screen.getByRole("button", { name: "Loading server version…" }),
  ).toBeDisabled();
  expect(screen.queryByText("Resolve save conflict")).toBeNull();
  completeReview?.();
  await view.rerender(
    <>
      <RecoveryControls />
      <ServerVersionProbe />
    </>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Resolve save conflict" }),
    ).toBeVisible(),
  );
  expect(screen.getByText("Server workout version")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Reapply my changes" }),
  ).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Resolve save conflict" }),
  );
  expect(
    screen.getByRole("header", { name: "Resolve save conflict" }),
  ).toBeVisible();
  await fireEvent.press(
    screen.getByRole("button", { name: "Reapply my changes" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Discard my pending changes" }),
  );
  expect(mockTraining.reviewConflict).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledWith("Reapply changes?", expect.any(String), expect.any(Array));
  expect(alert).toHaveBeenCalledWith("Discard pending edits?", expect.any(String), expect.any(Array));
  alert.mockRestore();
});

it("shows a retryable review error and withholds conflict actions until server loading succeeds", async () => {
  mockTraining.status = "conflict";
  mockTraining.reviewConflict.mockRejectedValueOnce(Error("offline"));
  await render(<RecoveryControls />);

  await fireEvent.press(
    screen.getByRole("button", { name: "Review server version" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load the server version. Check your connection and retry.",
    ),
  );
  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.queryByText("Reapply my changes")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Resolve save conflict" }),
  ).toBeNull();

  await fireEvent.press(
    screen.getByRole("button", { name: "Retry server review" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Resolve save conflict" }),
    ).toBeVisible(),
  );
  expect(mockTraining.reviewConflict).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Reapply my changes")).toBeNull();
});

it("requires a fresh server review when another conflict arrives after an earlier review", async () => {
  mockTraining.status = "conflict";
  const view = await render(<RecoveryControls />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Review server version" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Resolve save conflict" }),
    ).toBeVisible(),
  );

  mockTraining.error = "This workout changed elsewhere. Review your local changes.";
  await view.rerender(<RecoveryControls />);
  expect(
    screen.getByRole("button", { name: "Review server version" }),
  ).toBeVisible();
});

it("validates the duration, preserves the sheet on failure, and closes after restart succeeds", async () => {
  mockTraining.timerDeadline = Date.now() + 20_000;
  await render(<RecoveryControls />);
  await fireEvent.press(screen.getByRole("button", { name: "Adjust rest" }));
  const duration = screen.getByLabelText("Rest duration seconds");

  await fireEvent.changeText(duration, "14");
  await fireEvent.press(screen.getByRole("button", { name: "Restart timer" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter 15–3600 seconds.");
  expect(mockTraining.restartRest).not.toHaveBeenCalled();

  mockTraining.restartRest.mockRejectedValueOnce(Error("offline"));
  await fireEvent.changeText(duration, "90");
  await fireEvent.press(screen.getByRole("button", { name: "Restart timer" }));
  expect(await screen.findByText("Could not update rest. Retry.")).toBeVisible();

  mockTraining.restartRest.mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole("button", { name: "Restart timer" }));
  await waitFor(() => expect(screen.queryByText("Restart rest duration")).toBeNull());
  expect(mockTraining.restartRest).toHaveBeenLastCalledWith(90);
});
