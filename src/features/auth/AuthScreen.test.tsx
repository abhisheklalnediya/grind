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
  expect(screen.getByRole("alert")).toBeVisible();
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
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
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
  expect(screen.getByText("This resets your Grind account password.")).toBeVisible();
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

it('validates new accounts, toggles password visibility and preserves exact successful signup input', async () => {
  jest.mocked(authService.signUp).mockResolvedValue({ session: null, user: null });
  await render(<AuthScreen mode="signup" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Enter a valid email and a password with at least 8 characters.')).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Email'), ' New@Example.com ');
  await fireEvent.changeText(screen.getByLabelText('Password'), ' exact password ');
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
  await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/auth/verify', params: { email: 'new@example.com' } }));
  expect(authService.signUp).toHaveBeenCalledWith('new@example.com', ' exact password ');
  await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(router.replace).toHaveBeenCalledWith('/auth/sign-in');
});

it('routes an immediately authenticated signup into the protected account gate', async () => {
  jest.mocked(authService.signUp).mockResolvedValue({ user: null, session: { user: { id: 'fixture' } } } as Awaited<ReturnType<typeof authService.signUp>>);
  await render(<AuthScreen mode="signup" />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'password');
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
});

it('validates recovery addresses and provides explicit sign-in navigation', async () => {
  await render(<AuthScreen mode="recovery" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
  expect(screen.getByText('Enter a valid email address.')).toBeVisible();
  expect(authService.recover).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(router.replace).toHaveBeenCalledWith('/auth/sign-in');
});

it('links sign-in to signup and recovery and locks form fields during a pending request', async () => {
  let finish: () => void = () => {};
  jest.mocked(authService.signIn).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<AuthScreen mode="signin" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(router.push).toHaveBeenCalledWith('/auth/sign-up');
  await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
  expect(router.push).toHaveBeenCalledWith('/auth/recovery');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'a@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'password');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  expect(screen.getByLabelText('Email')).toHaveProp('editable', false);
  expect(screen.getByLabelText('Password')).toHaveProp('editable', false);
  await fireEvent.press(screen.getByRole('button', { name: 'Please wait…' }));
  expect(authService.signIn).toHaveBeenCalledTimes(1);
  finish(); await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
});
