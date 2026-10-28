import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import {
  Alert,
  Pressable as MockPressable,
  Text as MockText,
} from "react-native";
import { useTraining } from "@/features/training";
import { useAuth } from "@/features/auth/AuthProvider";
import { SettingsRoute } from "./SettingsRoute";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/services/scopedSettings", () => ({
  scopedSettings: jest.fn(() => ({ load: jest.fn(), save: jest.fn() })),
}));
jest.mock("./SettingsScreen", () => {
  return {
    SettingsScreen: ({
      beforeSignOut,
    }: {
      beforeSignOut: () => Promise<boolean>;
    }) => (
      <MockPressable
        onPress={() => {
          void beforeSignOut().then((result) => mockOutcome(result));
        }}
      >
        <MockText>Sign out</MockText>
      </MockPressable>
    ),
  };
});
const mockOutcome = jest.fn();
const discardPending = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: null } as ReturnType<typeof useAuth>);
  discardPending.mockResolvedValue(undefined);
});
it("allows clean signout and guards pending changes with stay/discard/dismiss", async () => {
  jest
    .mocked(useTraining)
    .mockReturnValue({
      hasLocalChanges: false,
      discardPending,
    } as unknown as ReturnType<typeof useTraining>);
  const view = await render(<SettingsRoute />);
  await fireEvent.press(screen.getByText("Sign out"));
  expect(mockOutcome).toHaveBeenCalledWith(true);
  jest
    .mocked(useTraining)
    .mockReturnValue({
      hasLocalChanges: true,
      discardPending,
    } as unknown as ReturnType<typeof useTraining>);
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: "user-a" } } } as ReturnType<
      typeof useAuth
    >);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await view.rerender(<SettingsRoute />);
  await fireEvent.press(screen.getByText("Sign out"));
  await act(async () => { alert.mock.lastCall?.[2]?.[0]?.onPress?.(); });
  await waitFor(() => expect(mockOutcome).toHaveBeenLastCalledWith(false));
  await fireEvent.press(screen.getByText("Sign out"));
  await act(async () => { alert.mock.lastCall?.[2]?.[1]?.onPress?.(); });
  expect(discardPending).toHaveBeenCalled();
  expect(mockOutcome).toHaveBeenLastCalledWith(true);
  await fireEvent.press(screen.getByText("Sign out"));
  await act(async () => { alert.mock.lastCall?.[3]?.onDismiss?.(); });
  await waitFor(() => expect(mockOutcome).toHaveBeenLastCalledWith(false));
  discardPending.mockRejectedValueOnce(Error("storage"));
  await fireEvent.press(screen.getByText("Sign out"));
  await act(async () => { alert.mock.lastCall?.[2]?.[1]?.onPress?.(); });
  await waitFor(() => expect(mockOutcome).toHaveBeenLastCalledWith(false));
  alert.mockRestore();
});
