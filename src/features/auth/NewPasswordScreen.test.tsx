import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { NewPasswordScreen } from "./NewPasswordScreen";
import { useAuth } from "./AuthProvider";
import { authService } from "./authService";
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("./AuthProvider", () => ({ useAuth: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
jest.mock("./authService", () => ({
  authService: { updatePassword: jest.fn() },
}));
it("requires a verified recovery context and only finishes after successful password update", async () => {
  const finishRecovery = jest.fn();
  jest
    .mocked(useAuth)
    .mockReturnValue({
      session: { user: { id: "test" } },
      recovery: true,
      finishRecovery,
    } as unknown as ReturnType<typeof useAuth>);
  jest.mocked(authService.updatePassword).mockResolvedValue(undefined);
  await render(<NewPasswordScreen />);
  expect(screen.getByText("Choose a new password for your Grind account.")).toBeVisible();
  await fireEvent.changeText(
    screen.getByLabelText("New password"),
    "new-test-password",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Confirm password"),
    "different",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Save new password" }),
  );
  expect(authService.updatePassword).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Confirm password"),
    "new-test-password",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Save new password" }),
  );
  await waitFor(() => expect(finishRecovery).toHaveBeenCalled());
});
it("does not offer password updates outside recovery", async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: null, recovery: false } as ReturnType<
      typeof useAuth
    >);
  await render(<NewPasswordScreen />);
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Request reset link" }),
  ).toBeVisible();
});

it('retains recovery drafts after a failed password update and allows requesting a fresh link', async () => {
  const finishRecovery = jest.fn();
  jest.mocked(useAuth).mockReturnValue({ session: { user: { id: 'fixture' } }, recovery: true, finishRecovery } as unknown as ReturnType<typeof useAuth>);
  jest.mocked(authService.updatePassword).mockRejectedValue(Error('private'));
  const view = await render(<NewPasswordScreen />);
  await fireEvent.changeText(screen.getByLabelText('New password'), 'retained-password');
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'retained-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
  expect(screen.getByLabelText('New password')).toHaveDisplayValue('retained-password');
  expect(finishRecovery).not.toHaveBeenCalled();
  await view.unmount();
  jest.mocked(useAuth).mockReturnValue({ session: { user: { id: 'fixture' } }, recovery: false } as unknown as ReturnType<typeof useAuth>);
  await render(<NewPasswordScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Request reset link' }));
  expect(router.replace).toHaveBeenCalledWith('/auth/recovery');
});
