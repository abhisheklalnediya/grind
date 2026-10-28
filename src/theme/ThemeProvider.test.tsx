import { useEffect } from "react";
import { Text, useColorScheme } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, type AppearanceStorage } from "./ThemeProvider";
import { useTheme, type ThemeState } from "./useTheme";
import { appearanceKey } from "./appearance";
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "dark"),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));
let observed: ThemeState | undefined;
function Probe() {
  const theme = useTheme();
  useEffect(() => {
    observed = theme;
  });
  return (
    <Text>
      {theme.mode}:{theme.preference}:{theme.hydrating ? "loading" : "ready"}:
      {theme.saving ? "saving" : "idle"}:{theme.error}
    </Text>
  );
}
function current() {
  if (!observed) throw Error("Probe must mount");
  return observed;
}
function fixture() {
  return {
    getItem: jest.fn(async (_key: string): Promise<string | null> => null),
    setItem: jest.fn(async (_key: string, _value: string) => {}),
  };
}
function deferred<T>() {
  let complete: (value: T) => void = () => {};
  let fail: (error: Error) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  return { promise, resolve: complete, reject: fail };
}
async function open(storage: AppearanceStorage, scope = "local:user-a") {
  return render(
    <ThemeProvider scope={scope} storage={storage}>
      <Probe />
    </ThemeProvider>,
  );
}
beforeEach(() => {
  observed = undefined;
  jest.clearAllMocks();
  jest.mocked(useColorScheme).mockReturnValue("dark");
});
it("has a safe non-persistent default outside a provider", async () => {
  await render(<Probe />);
  expect(screen.getByText("dark:system:ready:idle:")).toBeVisible();
  await act(async () => {
    current().retry();
    await current().setPreference("light");
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it("uses default native storage, follows phone changes and restores an explicit choice", async () => {
  jest.mocked(useColorScheme).mockReturnValue("light");
  const view = await render(
    <ThemeProvider scope="local:user-a">
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(current().hydrating).toBe(false));
  expect(current().mode).toBe("light");
  jest.mocked(useColorScheme).mockReturnValue("dark");
  await view.rerender(
    <ThemeProvider scope="local:user-a">
      <Probe />
    </ThemeProvider>,
  );
  expect(current().mode).toBe("dark");
  await act(async () => {
    await current().setPreference("light");
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    appearanceKey("local:user-a"),
    "light",
  );
  expect(current().mode).toBe("light");
  await view.unmount();
  const storage = fixture();
  storage.getItem.mockResolvedValue("light");
  await open(storage);
  await waitFor(() => expect(current().preference).toBe("light"));
});
it("reports read failure, falls back to System and reloads without inventing a saved value", async () => {
  const storage = fixture();
  storage.getItem
    .mockRejectedValueOnce(Error("private path"))
    .mockResolvedValueOnce("light");
  await open(storage);
  await waitFor(() => expect(current().error).toContain("Couldn’t load"));
  expect(current().preference).toBe("system");
  expect(current().hydrating).toBe(false);
  await act(() => current().retry());
  await waitFor(() => expect(current().preference).toBe("light"));
  expect(current().error).toBe("");
});
it("retains committed appearance when saving fails and can retry a new write", async () => {
  const storage = fixture();
  storage.getItem.mockResolvedValue("dark");
  storage.setItem
    .mockRejectedValueOnce(Error("disk"))
    .mockResolvedValueOnce(undefined);
  await open(storage);
  await waitFor(() => expect(current().hydrating).toBe(false));
  await act(async () => {
    await expect(current().setPreference("light")).rejects.toThrow("disk");
  });
  expect(current().preference).toBe("dark");
  expect(current().error).toContain("Couldn’t save");
  expect(current().saving).toBe(false);
  await act(async () => {
    await current().setPreference("light");
  });
  expect(current().preference).toBe("light");
  expect(current().error).toBe("");
});
it("serializes writes and applies only the latest selection", async () => {
  const storage = fixture();
  const first = deferred<void>();
  storage.setItem.mockImplementationOnce(() => first.promise);
  await open(storage);
  await waitFor(() => expect(current().hydrating).toBe(false));
  let one = Promise.resolve(),
    two = Promise.resolve();
  await act(async () => {
    one = current().setPreference("light");
    two = current().setPreference("dark");
    await Promise.resolve();
  });
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(current().saving).toBe(true);
  await act(async () => {
    first.resolve(undefined);
    await one;
    await two;
  });
  expect(storage.setItem.mock.calls.map((call) => call[1])).toEqual([
    "light",
    "dark",
  ]);
  expect(current().preference).toBe("dark");
  expect(current().saving).toBe(false);
});
it("continues a serialized queue after rejection and keeps the last successful persisted choice", async () => {
  const storage = fixture();
  const first = deferred<void>();
  storage.setItem
    .mockImplementationOnce(() => first.promise)
    .mockRejectedValueOnce(Error("second"));
  await open(storage);
  await waitFor(() => expect(current().hydrating).toBe(false));
  let one = Promise.resolve(),
    two: Promise<unknown> = Promise.resolve();
  await act(async () => {
    one = current().setPreference("light");
    two = current()
      .setPreference("dark")
      .catch((error) => error);
    await Promise.resolve();
  });
  await act(async () => {
    first.resolve(undefined);
    await one;
    await two;
  });
  expect(current().preference).toBe("light");
  expect(current().error).toContain("Couldn’t save");
  storage.setItem.mockResolvedValue(undefined);
  await act(async () => {
    await current().setPreference("system");
  });
  expect(current().preference).toBe("system");
});
it("does not overwrite a new selection with a stale initial read", async () => {
  const storage = fixture();
  const read = deferred<string | null>();
  storage.getItem.mockReturnValue(read.promise);
  await open(storage);
  await act(async () => {
    await current().setPreference("light");
    read.resolve("dark");
    await read.promise;
  });
  expect(current().preference).toBe("light");
});
it("handles a rejected write before hydration and ignores its superseded read error", async () => {
  const storage = fixture();
  const read = deferred<string | null>();
  storage.getItem.mockReturnValue(read.promise);
  storage.setItem.mockRejectedValue(Error("full"));
  await open(storage);
  await act(async () => {
    await expect(current().setPreference("dark")).rejects.toThrow("full");
    read.reject(Error("read"));
    await read.promise.catch(() => {});
  });
  expect(current().preference).toBe("system");
  expect(current().error).toContain("Couldn’t save");
  expect(current().hydrating).toBe(false);
});
it("isolates scopes and rejects stale reads and write completions from the old account", async () => {
  const storage = fixture();
  const oldRead = deferred<string | null>();
  storage.getItem
    .mockReturnValueOnce(oldRead.promise)
    .mockResolvedValueOnce("light");
  const view = await open(storage, "local:a");
  await view.rerender(
    <ThemeProvider scope="local:b" storage={storage}>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(current().preference).toBe("light"));
  await act(async () => {
    oldRead.resolve("dark");
    await oldRead.promise;
  });
  expect(current().scope).toBe("local:b");
  expect(current().preference).toBe("light");
  const write = deferred<void>();
  storage.setItem.mockReturnValueOnce(write.promise);
  let pending = Promise.resolve();
  await act(async () => {
    pending = current().setPreference("dark");
    await Promise.resolve();
  });
  await view.rerender(
    <ThemeProvider scope="other:a" storage={storage}>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(current().preference).toBe("system"));
  await act(async () => {
    write.resolve(undefined);
    await pending;
  });
  expect(current().scope).toBe("other:a");
  expect(current().preference).toBe("system");
  expect(current().saving).toBe(false);
});
it("ignores rejected reads and writes after scope change and unmount", async () => {
  const storage = fixture();
  const oldRead = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(oldRead.promise);
  const view = await open(storage, "local:a");
  await view.rerender(
    <ThemeProvider scope="local:b" storage={storage}>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(current().hydrating).toBe(false));
  await act(async () => {
    oldRead.reject(Error("old"));
    await oldRead.promise.catch(() => {});
  });
  expect(current().error).toBe("");
  const write = deferred<void>();
  storage.setItem.mockReturnValueOnce(write.promise);
  let pending: Promise<unknown> = Promise.resolve();
  await act(async () => {
    pending = current()
      .setPreference("dark")
      .catch((error) => error);
    await Promise.resolve();
  });
  await view.unmount();
  await act(async () => {
    write.reject(Error("late"));
    await pending;
  });
  const pendingRead = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(pendingRead.promise);
  const second = await open(storage);
  await second.unmount();
  await act(async () => {
    pendingRead.resolve("dark");
    await pendingRead.promise;
  });
});
it("does not publish a successful write after unmount", async () => {
  const storage = fixture();
  const write = deferred<void>();
  const view = await open(storage);
  await waitFor(() => expect(current().hydrating).toBe(false));
  storage.setItem.mockReturnValue(write.promise);
  let pending = Promise.resolve();
  await act(async () => {
    pending = current().setPreference("light");
    await Promise.resolve();
  });
  await view.unmount();
  await act(async () => {
    write.resolve(undefined);
    await pending;
  });
});
