import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthFields } from "./AuthFields";

beforeEach(() => jest.clearAllMocks());

const base = {
  mode: "signin" as const,
  email: "alex@example.com",
  password: "secret-pass",
  emailError: "Enter a valid email address.",
  passwordError: "Enter your password.",
  pending: false,
  visible: false,
  onEmailChange: jest.fn(),
  onPasswordChange: jest.fn(),
  onSubmit: jest.fn(),
  onToggleVisibility: jest.fn(),
};

it("associates field feedback and password-manager/keyboard hints with the inputs", async () => {
  await render(<AuthFields {...base} />);
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(screen.getByText("Enter your password.")).toBeVisible();
  expect(screen.getByLabelText("Email")).toHaveProp("autoComplete", "email");
  expect(screen.getByLabelText("Email")).toHaveProp("returnKeyType", "next");
  expect(screen.getByLabelText("Password")).toHaveProp("autoComplete", "current-password");
  expect(screen.getByLabelText("Password")).toHaveProp("returnKeyType", "done");
  await fireEvent(screen.getByLabelText("Password"), "submitEditing");
  expect(base.onSubmit).toHaveBeenCalledTimes(1);
});

it("hides the password for recovery and submits from the email done action", async () => {
  await render(
    <AuthFields {...base} mode="recovery" password="" passwordError="" />,
  );
  expect(screen.queryByLabelText("Password")).toBeNull();
  expect(screen.getByLabelText("Email")).toHaveProp("returnKeyType", "done");
  await fireEvent(screen.getByLabelText("Email"), "submitEditing");
  expect(base.onSubmit).toHaveBeenCalledTimes(1);
});

it("shows signup requirements and gives visibility control a clear accessible action", async () => {
  await render(<AuthFields {...base} mode="signup" />);
  expect(screen.getByText("Use 8–256 characters. Your password is not trimmed.")).toBeVisible();
  expect(screen.getByLabelText("Password")).toHaveProp("autoComplete", "new-password");
  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(base.onToggleVisibility).toHaveBeenCalledTimes(1);
});
