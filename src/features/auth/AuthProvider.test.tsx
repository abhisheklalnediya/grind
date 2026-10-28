import { useEffect } from "react";
import { AppState, Text, type AppStateStatus } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "./AuthProvider";
import {
  subscribeVerifiedSession,
  type VerifiedAuthState,
} from "./sessionLifecycle";
import { getSupabase } from "@/services/supabase";
jest.mock("./sessionLifecycle", () => ({
  subscribeVerifiedSession: jest.fn(),
}));
jest.mock("@/services/supabase", () => ({ getSupabase: jest.fn() }));
function Status() {
  const auth = useAuth();
  return (
    <Text>{`${auth.session?.user.id ?? "out"}:${auth.recovery ? "recovery" : "normal"}`}</Text>
  );
}
it("latches recovery across refresh and clears it on account switch/sign-out", async () => {
  let notify: (state: VerifiedAuthState) => void = () => {};
  jest.mocked(subscribeVerifiedSession).mockImplementation((_, callback) => {
    notify = callback;
    return jest.fn();
  });
  jest.mocked(getSupabase).mockReturnValue({
    auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
  } as unknown as ReturnType<typeof getSupabase>);
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { gcTime: Infinity, retry: false } },
        })
      }
    >
      <AuthProvider>
        <Status />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(subscribeVerifiedSession).toHaveBeenCalled());
  const session = { user: { id: "first" } } as Session;
  await act(() => notify({ session, error: "", recovery: true }));
  expect(screen.getByText("first:recovery")).toBeVisible();
  await act(() => notify({ session, error: "", recovery: false }));
  expect(screen.getByText("first:recovery")).toBeVisible();
  await act(() =>
    notify({
      session: { user: { id: "second" } } as Session,
      error: "",
      recovery: false,
    }),
  );
  expect(screen.getByText("second:normal")).toBeVisible();
  await act(() => notify({ session: null, error: "", recovery: false }));
  expect(screen.getByText("out:normal")).toBeVisible();
});

it("rejects consumers outside the provider and retries initialization errors without stale callbacks", async () => {
  await expect(render(<Status />)).rejects.toThrow("AuthProvider is required");
  jest.mocked(subscribeVerifiedSession).mockReset();
  const startAutoRefresh = jest.fn(),
    stopAutoRefresh = jest.fn();
  const unsubscribe = jest.fn();
  let notify: (state: VerifiedAuthState) => void = () => {};
  jest.mocked(subscribeVerifiedSession).mockImplementation((_, callback) => {
    notify = callback;
    return unsubscribe;
  });
  jest
    .mocked(getSupabase)
    .mockImplementationOnce(() => {
      throw Error("local configuration failed");
    })
    .mockReturnValue({
      auth: { startAutoRefresh, stopAutoRefresh },
    } as unknown as ReturnType<typeof getSupabase>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const latest: { current: ReturnType<typeof useAuth> | null } = {
    current: null,
  };
  function Probe() {
    const auth = useAuth();
    useEffect(() => {
      latest.current = auth;
    }, [auth]);
    return <Text>{`${auth.initializing}:${auth.error}`}</Text>;
  }
  const view = await render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(latest.current?.initializing).toBe(false));
  expect(latest.current?.error).not.toBe("");
  await act(() => {
    latest.current?.retry();
  });
  expect(subscribeVerifiedSession).toHaveBeenCalled();
  const session = { user: { id: "same" } } as Session;
  await act(() => notify({ session, error: "", recovery: false }));
  await act(() => notify({ session, error: "", recovery: false }));
  expect(latest.current?.recovery).toBe(false);
  await act(() => notify({ session, error: "", recovery: true }));
  expect(latest.current?.recovery).toBe(true);
  await act(() => latest.current?.finishRecovery());
  expect(latest.current?.recovery).toBe(false);
  await view.unmount();
  expect(unsubscribe).toHaveBeenCalled();
  expect(stopAutoRefresh).toHaveBeenCalled();
  await act(() =>
    notify({
      session: { user: { id: "old" } } as Session,
      error: "stale",
      recovery: true,
    }),
  );
  expect(latest.current?.session?.user.id).toBe("same");
});

it("starts/stops refresh on application state transitions and removes its listener", async () => {
  const startAutoRefresh = jest.fn(),
    stopAutoRefresh = jest.fn(),
    remove = jest.fn();
  let transition: (state: AppStateStatus) => void = () => {};
  const listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      transition = callback;
      return { remove };
    });
  jest.mocked(getSupabase).mockReturnValue({
    auth: { startAutoRefresh, stopAutoRefresh },
  } as unknown as ReturnType<typeof getSupabase>);
  jest.mocked(subscribeVerifiedSession).mockReturnValue(jest.fn());
  const view = await render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Status />
      </AuthProvider>
    </QueryClientProvider>,
  );
  transition("background");
  transition("active");
  expect(stopAutoRefresh).toHaveBeenCalled();
  expect(startAutoRefresh).toHaveBeenCalled();
  await view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  listener.mockRestore();
});
it("ignores a queued initialization failure after unmount", async () => {
  let queued: VoidFunction | null = null;
  const queue = jest.spyOn(global, "queueMicrotask");
  jest.mocked(getSupabase).mockImplementationOnce(() => {
    // Hold this initialization failure until its owning provider has unmounted.
    queue.mockImplementationOnce((callback) => {
      queued = callback;
    });
    throw Error("configuration");
  });
  const view = await render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Status />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await view.unmount();
  expect(queued).not.toBeNull();
  if (queued) (queued as VoidFunction)();
  queue.mockRestore();
});
