import { StrictMode, useEffect } from "react";
import { AppState, Text, type AppStateStatus } from "react-native";
import * as outboxModule from "@/services/training/outbox";
import { act, render, waitFor } from "@testing-library/react-native";
import { TrainingProvider, useTraining } from "./TrainingProvider";
import type { TrainingContextValue } from "./types";
import * as apiModule from "@/services/training/api";
import { TrainingError } from "@/services/training/errors";
import { createTrainingApi } from "@/services/training/api";
import type { DraftStorage } from "@/services/training/outboxState";
import { makeSession, trainingId } from "../../../tests/fixtures/training";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "10000000-0000-4000-8000-000000000099",
}));
const storage: DraftStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
};
let context: TrainingContextValue;
const mounted = jest.fn(),
  unmounted = jest.fn();
function Probe() {
  const training = useTraining();
  useEffect(() => {
    context = training;
  }, [training]);
  useEffect(() => {
    mounted();
    return unmounted;
  }, []);
  return <Text>{training.session?.name ?? training.status}</Text>;
}
function api() {
  const session = makeSession();
  return {
    ...createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() }),
    active: jest.fn(async () => session),
    workout: jest.fn(async () => session),
    apply: jest.fn(async () => ({ ...session, name: "Push", revision: 1 })),
    cancel: jest.fn(async () => ({ ...session, status: "cancelled" as const })),
    start: jest.fn(async () => session),
  };
}
beforeEach(() => jest.clearAllMocks());
it("requires its context and keeps children mounted while disabling and switching accounts", async () => {
  await expect(render(<Probe />)).rejects.toThrow("useTraining requires");
  const first = api(),
    second = api();
  const view = await render(
    <TrainingProvider scope="a" enabled={false} api={first} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  expect(first.active).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
  await expect(context.retry()).rejects.toThrow();
  await view.rerender(
    <TrainingProvider scope="a" api={first} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(context.session?.id).toBe(trainingId(1)));
  const old = context;
  await view.rerender(
    <TrainingProvider scope="b" api={second} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(second.active).toHaveBeenCalled());
  await expect(old.setRaw("x", "1")).rejects.toThrow();
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  await view.rerender(
    <TrainingProvider
      scope="signed-out"
      enabled={false}
      api={second}
      storage={storage}
    >
      <Probe />
    </TrainingProvider>,
  );
  expect(context.session).toBeNull();
  expect(context.api).toBeNull();
  expect(mounted).toHaveBeenCalledTimes(1);
});
it("supports StrictMode setup/cleanup and forwards editing and recovery actions", async () => {
  const service = api();
  await render(
    <StrictMode>
      <TrainingProvider scope="a" api={service} storage={storage}>
        <Probe />
      </TrainingProvider>
    </StrictMode>,
  );
  await waitFor(() => expect(context.session).not.toBeNull());
  await act(async () => {
    await context.setRaw("x", "72.");
  });
  expect(context.raw.x).toBe("72.");
  await act(async () => {
    await context.setRaw("x", "");
    await context.command({ type: "rename_workout", name: "Push" });
    await context.retry();
  });
  expect(context.savedSession?.revision).toBe(1);
  await act(async () => {
    await expect(context.restartRest(30)).rejects.toThrow();
    await context.skipRest();
    await context.extendRest();
    await context.reviewConflict();
    await context.reapply();
    await context.discardPending();
  });
  await act(async () => {
    await expect(context.finish()).rejects.toThrow();
  });
  await act(async () => {
    await context.cancel();
    await context.start(null);
  });
  expect(service.cancel).toHaveBeenCalled();
  expect(service.start).toHaveBeenCalled();
});
it("constructs a user-scoped default API only when enabled with identity and exposes pending start recovery", async () => {
  const service = api();
  const factory = jest.spyOn(apiModule, "trainingApi").mockReturnValue(service);
  const view = await render(
    <TrainingProvider scope="signed-out">
      <Probe />
    </TrainingProvider>,
  );
  expect(context.api).toBeNull();
  expect(factory).not.toHaveBeenCalled();
  await view.rerender(
    <TrainingProvider scope="user" userId={trainingId(8)}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(context.session).not.toBeNull());
  expect(factory).toHaveBeenCalledWith(trainingId(8));
  await act(async () => {
    await context.cancel();
  });
  service.start.mockRejectedValueOnce(new TrainingError("network"));
  await act(async () => {
    await expect(context.start(null)).rejects.toThrow();
  });
  expect(context.pending).toBe(1);
  expect(context.hasLocalChanges).toBe(true);
  factory.mockRestore();
});

it("announces acknowledged completed graphs once, including hydration, and supports callers without callbacks", async () => {
  const completed = {
    ...makeSession(),
    status: "completed" as const,
    finished_at: "2026-10-28T10:00:00Z",
  };
  const service = api();
  service.active.mockResolvedValue(completed);
  service.workout.mockResolvedValue(completed);
  const onCompleted = jest.fn();
  const view = await render(
    <TrainingProvider
      scope="complete"
      api={service}
      storage={storage}
      onCompleted={onCompleted}
    >
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(onCompleted).toHaveBeenCalledWith(completed));
  await act(async () => {
    await context.skipRest();
    await context.discardPending();
  });
  expect(onCompleted).toHaveBeenCalledTimes(1);
  await view.unmount();
  await render(
    <TrainingProvider scope="no-callback" api={service} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(context.savedSession?.status).toBe("completed"));
});

it("retries scoped pending work on foreground, catches failures and never rebases conflicts", async () => {
  const handlers: ((state: AppStateStatus) => void)[] = [];
  const remove = jest.fn();
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      handlers.push(callback);
      return { remove };
    });
  const realCreate = outboxModule.createTrainingOutbox;
  const retry = jest.fn<
    ReturnType<outboxModule.TrainingOutbox["retry"]>,
    Parameters<outboxModule.TrainingOutbox["retry"]>
  >();
  const factory = jest
    .spyOn(outboxModule, "createTrainingOutbox")
    .mockImplementation((options) => {
      const controller = realCreate(options);
      retry.mockImplementation(() => controller.retry());
      return { ...controller, retry };
    });
  const service = api();
  let resolveActive: ((value: ReturnType<typeof makeSession>) => void) | null =
    null;
  service.active.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveActive = resolve;
      }),
  );
  const view = await render(
    <TrainingProvider scope="a" api={service} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await act(() => {
    handlers[0]?.("background");
    handlers[0]?.("active");
  });
  expect(retry).not.toHaveBeenCalled();
  await act(() => {
    if (resolveActive) resolveActive(makeSession());
  });
  await waitFor(() => expect(context.status).toBe("saved"));
  await act(() => handlers[0]?.("active"));
  expect(retry).not.toHaveBeenCalled();
  service.apply
    .mockRejectedValueOnce(new TrainingError("network"))
    .mockRejectedValueOnce(new TrainingError("network"));
  await act(async () => {
    await context.command({ type: "rename_workout", name: "Offline" });
  });
  await waitFor(() => expect(context.status).toBe("error"));
  await act(() => handlers[0]?.("active"));
  await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(context.status).toBe("error"));
  await act(() => handlers[0]?.("active"));
  await waitFor(() => expect(context.status).toBe("saved"));
  expect(context.pending).toBe(0);
  service.apply.mockRejectedValueOnce(new TrainingError("conflict"));
  await act(async () => {
    await context.command({ type: "rename_workout", name: "Conflict" });
  });
  await waitFor(() => expect(context.status).toBe("conflict"));
  const calls = retry.mock.calls.length;
  await act(() => handlers[0]?.("active"));
  expect(retry).toHaveBeenCalledTimes(calls);
  await view.rerender(
    <TrainingProvider scope="b" api={api()} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(context.status).toBe("saved"));
  await act(() => handlers[0]?.("active"));
  expect(retry).toHaveBeenCalledTimes(calls);
  await view.unmount();
  await act(() => handlers[1]?.("active"));
  expect(retry).toHaveBeenCalledTimes(calls);
  expect(remove).toHaveBeenCalledTimes(2);
  factory.mockRestore();
  listener.mockRestore();
});
it("retries an initialization error with no queued edits on foreground", async () => {
  const handlers: ((state: AppStateStatus) => void)[] = [];
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      handlers.push(callback);
      return { remove: jest.fn() };
    });
  const service = api();
  service.active.mockRejectedValueOnce(new TrainingError("network"));
  const view = await render(
    <TrainingProvider scope="error" api={service} storage={storage}>
      <Probe />
    </TrainingProvider>,
  );
  await waitFor(() => expect(context.status).toBe("error"));
  expect(context.hasLocalChanges).toBe(false);
  await act(() => handlers[0]?.("active"));
  await waitFor(() => expect(context.status).toBe("saved"));
  await view.unmount();
  listener.mockRestore();
});
