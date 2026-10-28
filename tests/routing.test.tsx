import type { PropsWithChildren } from "react";
import { screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "../app/_layout";
import TabsLayout from "../app/(tabs)/_layout";
import AuthLayout from "../app/auth/_layout";
import Train from "../app/(tabs)/index";
import SignIn from "../app/auth/sign-in";
jest.mock("../src/features/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: PropsWithChildren) => children,
  useAuth: () => ({
    session: null,
    initializing: false,
    error: "",
    recovery: false,
    retry: jest.fn(),
    finishRecovery: jest.fn(),
  }),
}));
jest.mock("../src/features/auth/authService", () => ({
  authService: { signOut: jest.fn() },
}));
jest.mock("../src/services/grindAccount", () => ({ joinGrind: jest.fn() }));
it("mounts the root navigator and redirects signed-out cold launches before protected contents", async () => {
  await renderRouter(
    {
      _layout: RootLayout,
      "(tabs)/_layout": TabsLayout,
      "(tabs)/index": Train,
      "auth/_layout": AuthLayout,
      "auth/sign-in": SignIn,
    },
    { initialUrl: "/" },
  );
  await waitFor(() => expect(screen.getByText("Welcome back.")).toBeVisible());
  expect(screen.queryByText("Ready to work?")).toBeNull();
});
