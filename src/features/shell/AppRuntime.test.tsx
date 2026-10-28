import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text, Text as MockText } from "react-native";
import * as SystemUI from "expo-system-ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { readEnvironment } from "@/services/environment";
import * as theme from "@/theme/useTheme";
import { darkColors } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppRuntime, AppNavigator } from "./AppRuntime";
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn(() => ({ data: { setup_completed_at: "now" } })),
}));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/services/environment", () => ({ readEnvironment: jest.fn() }));
jest.mock("@/features/preferences", () => ({
  TrainingDefaultsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock("@/features/training", () => {
  return {
    TrainingProvider: ({
      children,
      scope,
      enabled,
      userId,
    }: {
      children: React.ReactNode;
      scope: string;
      enabled: boolean;
      userId?: string;
    }) => (
      <>
        <MockText>{`${scope}:${enabled}:${userId}`}</MockText>
        {children}
      </>
    ),
  };
});
jest.mock("expo-router", () => {
  return { Stack: () => <MockText>Navigator mounted</MockText> };
});
jest.mock("expo-status-bar", () => {
  return {
    StatusBar: ({ style }: { style: string }) => (
      <MockText>{`Status ${style}`}</MockText>
    ),
  };
});
jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
}));
function Probe() {
  const { scope } = useTheme();
  return <Text>{scope}</Text>;
}
it("scopes signed-out and signed-in preferences without replacing the navigator", async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: null } as ReturnType<typeof useAuth>);
  jest.mocked(readEnvironment).mockReturnValue(null);
  const view = await render(
    <AppRuntime>
      <AppNavigator />
      <Probe />
    </AppRuntime>,
  );
  expect(
    screen.getByText("unconfigured/signed-out:false:undefined"),
  ).toBeVisible();
  expect(screen.getByText("Navigator mounted")).toBeVisible();
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: "user-a" } } } as ReturnType<
      typeof useAuth
    >);
  jest
    .mocked(readEnvironment)
    .mockReturnValue({ url: "http://localhost:55421", key: "fixture" });
  await view.rerender(
    <AppRuntime onCompleted={jest.fn()}>
      <AppNavigator />
      <Probe />
    </AppRuntime>,
  );
  expect(
    screen.getByText("http://localhost:55421/user-a:true:user-a"),
  ).toBeVisible();
  expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalled();
});
it("uses dark system bars and safely handles native system UI rejection", async () => {
  const spy = jest
    .spyOn(theme, "useTheme")
    .mockReturnValue({ colors: darkColors, mode: "dark" } as ReturnType<
      typeof useTheme
    >);
  jest
    .mocked(SystemUI.setBackgroundColorAsync)
    .mockRejectedValueOnce(Error("unavailable"));
  await render(<AppNavigator />);
  expect(screen.getByText("Status light")).toBeVisible();
  spy.mockRestore();
});

it("keeps recovery IO disabled before membership/setup or during password recovery", async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({
      session: { user: { id: "user-a" } },
      recovery: false,
    } as ReturnType<typeof useAuth>);
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: undefined } as ReturnType<typeof useQuery>);
  const view = await render(
    <AppRuntime>
      <Probe />
    </AppRuntime>,
  );
  expect(
    screen.getByText("http://localhost:55421/user-a:false:user-a"),
  ).toBeVisible();
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: { setup_completed_at: "now" } } as ReturnType<
      typeof useQuery
    >);
  jest
    .mocked(useAuth)
    .mockReturnValue({
      session: { user: { id: "user-a" } },
      recovery: true,
    } as ReturnType<typeof useAuth>);
  await view.rerender(
    <AppRuntime>
      <Probe />
    </AppRuntime>,
  );
  expect(
    screen.getByText("http://localhost:55421/user-a:false:user-a"),
  ).toBeVisible();
});
