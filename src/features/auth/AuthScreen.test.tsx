import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { AuthScreen } from "./AuthScreen";
import { authService } from "./authService";
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("./authService", () => ({
  authService: { signIn: jest.fn(), signUp: jest.fn(), recover: jest.fn() },
}));
beforeEach(() => jest.clearAllMocks());
it("validates before requests, normalizes email and awaits successful sign-in", async () => {
  await render(<AuthScreen mode="signin" />);
  expect(screen.getByText("Sign in to your Grind account.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(authService.signIn).not.toHaveBeenCalled();
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(screen.getByText("Enter your password.")).toBeVisible();
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "  Alex@Example.com ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "sample-password",
  );
  jest.mocked(authService.signIn).mockResolvedValue(undefined);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Opening your account…");
  expect(router.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(authService.signIn).toHaveBeenCalledWith(
    "alex@example.com",
    "sample-password",
  );
});
it("retains failed form input and never exposes provider secrets", async () => {
  jest.mocked(authService.signIn).mockRejectedValue(new Error("secret_token"));
  await render(<AuthScreen mode="signin" />);
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "alex@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "sample-password",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
  expect(screen.queryByText("secret_token")).toBeNull();
  expect(screen.getByLabelText("Email")).toHaveDisplayValue("alex@example.com");
  expect(router.replace).not.toHaveBeenCalled();
});
it("shows recovery confirmation without claiming an account exists", async () => {
  jest.mocked(authService.recover).mockResolvedValue(undefined);
  await render(<AuthScreen mode="recovery" />);
  expect(screen.getByText("Reset your Grind account password.")).toBeVisible();
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "alex@example.com",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  await waitFor(() =>
    expect(
      screen.getByText("If an account exists, a reset link is on its way."),
    ).toBeVisible(),
  );
});
it("allows an existing account password shorter than the new-account policy", async () => {
  jest.mocked(authService.signIn).mockResolvedValue(undefined);
  await render(<AuthScreen mode="signin" />);
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "existing@example.com",
  );
  await fireEvent.changeText(screen.getByLabelText("Password"), "six123");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(authService.signIn).toHaveBeenCalledWith(
      "existing@example.com",
      "six123",
    ),
  );
});

it("validates new accounts, toggles password visibility and preserves exact successful signup input", async () => {
  jest
    .mocked(authService.signUp)
    .mockResolvedValue({ session: null, user: null });
  await render(<AuthScreen mode="signup" />);
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(
    screen.getByText(
      "Use at least 8 characters. Passwords can be up to 256 characters.",
    ),
  ).toBeVisible();
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    " New@Example.com ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    " exact password ",
  );
  expect(screen.getByLabelText("Password")).toHaveProp("secureTextEntry", true);
  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password")).toHaveProp(
    "secureTextEntry",
    false,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Hide password" }));
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() =>
    expect(screen.getByText(/You’re not signed in yet/)).toBeVisible(),
  );
  expect(router.push).not.toHaveBeenCalled();
  expect(authService.signUp).toHaveBeenCalledWith(
    "new@example.com",
    " exact password ",
  );
  expect(
    screen.getByText("Create your Grind account, then complete a short setup."),
  ).toBeVisible();
  expect(
    screen.getByText("Use 8–256 characters. Your password is not trimmed."),
  ).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Try signing in" }));
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/auth/sign-in",
    params: { email: " New@Example.com " },
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Request password reset" }),
  );
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/auth/recovery",
    params: { email: " New@Example.com " },
  });
});

it("routes an immediately authenticated signup into the protected account gate", async () => {
  jest.mocked(authService.signUp).mockResolvedValue({
    user: null,
    session: { user: { id: "fixture" } },
  } as Awaited<ReturnType<typeof authService.signUp>>);
  await render(<AuthScreen mode="signup" />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "new@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "password");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  await screen.findByText("Opening your account…");
  expect(router.replace).not.toHaveBeenCalled();
});

it("validates recovery addresses and provides explicit sign-in navigation", async () => {
  await render(<AuthScreen mode="recovery" />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(authService.recover).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to sign in" }),
  );
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/auth/sign-in",
    params: {},
  });
});

it("links sign-in with email only, supports keyboard next/submit and locks during pending requests", async () => {
  let finish: () => void = () => {};
  jest.mocked(authService.signIn).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(<AuthScreen mode="signin" />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "a@example.com");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/auth/sign-up",
    params: { email: "a@example.com" },
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Forgot password?" }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/auth/recovery",
    params: { email: "a@example.com" },
  });
  await fireEvent.changeText(screen.getByLabelText("Password"), "password");
  expect(screen.getByLabelText("Email")).toHaveProp("returnKeyType", "next");
  expect(screen.getByLabelText("Password")).toHaveProp("returnKeyType", "done");
  await fireEvent(screen.getByLabelText("Email"), "submitEditing");
  await fireEvent(screen.getByLabelText("Password"), "submitEditing");
  await fireEvent(screen.getByLabelText("Password"), "submitEditing");
  expect(authService.signIn).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  finish();
  await screen.findByText("Opening your account…");
  expect(router.replace).not.toHaveBeenCalled();
});

it("opens signup without putting an absent email or password in the route", async () => {
  await render(<AuthScreen mode="signin" />);
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "private-password",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/auth/sign-up",
    params: {},
  });
  expect(router.push).not.toHaveBeenCalledWith(
    expect.objectContaining({
      params: expect.objectContaining({ password: expect.anything() }),
    }),
  );
});

it("shows field-specific validation and transfers only email when opened with route parameters", async () => {
  const { useLocalSearchParams } = jest.requireMock("expo-router") as {
    useLocalSearchParams: jest.Mock;
  };
  useLocalSearchParams.mockReturnValue({ email: "alex@example.com" });
  await render(<AuthScreen mode="signup" />);
  expect(screen.getByLabelText("Email")).toHaveDisplayValue("alex@example.com");
  await fireEvent.changeText(screen.getByLabelText("Email"), "invalid-address");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(
    screen.getByText(
      "Use at least 8 characters. Passwords can be up to 256 characters.",
    ),
  ).toBeVisible();
  expect(authService.signUp).not.toHaveBeenCalled();
});

it("does not navigate or update a stale form after an auth request settles on another screen", async () => {
  let finish: () => void = () => {};
  jest.mocked(authService.signIn).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await render(<AuthScreen mode="signin" />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "a@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "password");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await view.unmount();
  finish();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(router.replace).not.toHaveBeenCalled();
});

it("requires only a valid email in recovery and submits from the email keyboard action", async () => {
  jest.mocked(authService.recover).mockResolvedValue(undefined);
  await render(<AuthScreen mode="recovery" />);
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "alex@example.com",
  );
  await fireEvent(screen.getByLabelText("Email"), "submitEditing");
  await waitFor(() =>
    expect(
      screen.getByText("If an account exists, a reset link is on its way."),
    ).toBeVisible(),
  );
  expect(authService.recover).toHaveBeenCalledWith("alex@example.com");
});
