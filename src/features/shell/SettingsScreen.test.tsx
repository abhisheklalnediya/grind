import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { SettingsScreen } from "./SettingsScreen";
import { useAuth } from "@/features/auth/AuthProvider";
import { authService } from "@/features/auth/authService";
import {
  loadSettings,
  saveSettings,
  type GrindSettings,
} from "@/services/grindAccount";
import { ThemeProvider } from "@/theme/ThemeProvider";
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/features/auth/authService", () => ({
  authService: { signOut: jest.fn() },
}));
jest.mock("@/services/grindAccount", () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));
const settings: GrindSettings = {
  user_id: "user-a",
  preferred_unit: "kg",
  default_rest_seconds: 120,
  updated_at: "now",
};
function identity(id: string, email?: string): Session {
  const user: User = {
    id,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "now",
    ...(email ? { email } : {}),
  };
  return {
    user,
    access_token: "test-token",
    refresh_token: "test-refresh",
    expires_in: 3600,
    token_type: "bearer",
  };
}
function auth(session: Session | null) {
  jest.mocked(useAuth).mockReturnValue({
    session,
    initializing: false,
    error: "",
    recovery: false,
    finishRecovery: jest.fn(),
    retry: jest.fn(),
  });
}
function harness() {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={query}>
        <ThemeProvider scope="local:user-a">{children}</ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { query, Wrapper };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadSettings).mockReset();
  jest.mocked(saveSettings).mockReset();
  jest.mocked(authService.signOut).mockReset();
  auth(identity("user-a", "alex@example.test"));
  jest.mocked(loadSettings).mockResolvedValue(settings);
  jest.mocked(saveSettings).mockResolvedValue(settings);
});
it("keeps training drafts across appearance changes and failed saves, and only announces acknowledged success", async () => {
  const { Wrapper } = harness();
  const saved = {
    ...settings,
    preferred_unit: "lb" as const,
    default_rest_seconds: 90,
  };
  jest
    .mocked(loadSettings)
    .mockResolvedValueOnce(settings)
    .mockResolvedValue(saved);
  jest
    .mocked(saveSettings)
    .mockRejectedValueOnce(Error("network-secret"))
    .mockResolvedValueOnce(saved);
  await render(<SettingsScreen />, { wrapper: Wrapper });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "kg ✓" })).toBeVisible(),
  );
  expect(
    screen.getByRole("button", { name: "Save preferences" }),
  ).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "lb" }));
  await fireEvent.press(screen.getByRole("button", { name: "90s" }));
  await fireEvent.press(screen.getByRole("button", { name: "Light" }));
  await waitFor(() =>
    expect(screen.getByText("Appearance saved.")).toBeVisible(),
  );
  expect(screen.getByRole("button", { name: "lb ✓" })).toBeVisible();
  expect(screen.getByRole("button", { name: "90s ✓" })).toBeVisible();
  await fireEvent.press(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/weren’t saved/),
  );
  expect(screen.queryByText("Preferences saved.")).toBeNull();
  expect(screen.queryByText("network-secret")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Preferences saved.")).toBeVisible(),
  );
  expect(saveSettings).toHaveBeenLastCalledWith("lb", 90);
  expect(
    screen.getByRole("button", { name: "Save preferences" }),
  ).toBeDisabled();
});
it("shows safe load failure, retries, and resets unsaved values for a different account", async () => {
  const { query, Wrapper } = harness();
  jest.mocked(loadSettings).mockRejectedValueOnce(Error("private-db"));
  const view = await render(<SettingsScreen />, { wrapper: Wrapper });
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn’t load/),
  );
  expect(screen.queryByText("private-db")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "lb" })).toBeVisible(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "lb" }));
  auth(identity("user-b"));
  jest
    .mocked(loadSettings)
    .mockResolvedValue({ ...settings, user_id: "user-b" });
  await view.rerender(<SettingsScreen />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "kg ✓" })).toBeVisible(),
  );
  expect(
    screen.getByRole("button", { name: "Save preferences" }),
  ).toBeDisabled();
  expect(query.getQueryData(["grind-settings", "user-b"])).toEqual(
    expect.objectContaining({ user_id: "user-b" }),
  );
});
it("blocks duplicate saves until the server acknowledges them and can save unchanged rest or units", async () => {
  const { Wrapper } = harness();
  let resolve: (value: GrindSettings) => void = () => {};
  jest.mocked(saveSettings).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await render(<SettingsScreen />, { wrapper: Wrapper });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "lb" })).toBeVisible(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "lb" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Light" })).toBeDisabled();
  expect(screen.queryByText("Preferences saved.")).toBeNull();
  await act(async () => {
    resolve(settings);
  });
  await waitFor(() =>
    expect(screen.getByText("Preferences saved.")).toBeVisible(),
  );
  expect(saveSettings).toHaveBeenCalledTimes(1);
  expect(saveSettings).toHaveBeenLastCalledWith("lb", 120);
  await fireEvent.press(screen.getByRole("button", { name: "60s" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  await waitFor(() => expect(saveSettings).toHaveBeenLastCalledWith("kg", 60));
});
it("keeps local sign-out retryable and does not attempt account deletion", async () => {
  const { Wrapper } = harness();
  jest
    .mocked(authService.signOut)
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce(undefined);
  await render(<SettingsScreen />, { wrapper: Wrapper });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Sign out of Grind" }),
    ).toBeEnabled(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Sign out of Grind" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn’t sign out/),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Sign out of Grind" }),
  );
  await waitFor(() => expect(authService.signOut).toHaveBeenCalledTimes(2));
  expect(
    screen.getByRole("button", { name: "Sign out of Grind" }),
  ).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Delete account" })).toBeNull();
});
it("closes preferences when there is no signed-in account", async () => {
  auth(null);
  const { Wrapper } = harness();
  await render(<SettingsScreen />, { wrapper: Wrapper });
  expect(
    screen.getByRole("header", { name: "Sign in to change your preferences." }),
  ).toBeVisible();
  expect(loadSettings).not.toHaveBeenCalled();
});
