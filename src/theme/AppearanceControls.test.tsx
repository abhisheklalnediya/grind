import { Text } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AppearanceControls } from "./AppearanceControls";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeContext, useTheme, type ThemeState } from "./useTheme";
import { darkColors } from "./tokens";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));
function fixture() {
  return {
    getItem: jest.fn(async (): Promise<string | null> => null),
    setItem: jest.fn(async (_key: string, _value: string) => {}),
  };
}
function Mode() {
  const { mode } = useTheme();
  return <Text>Mode {mode}</Text>;
}
it("shows System/Light/Dark choices, saves selection and updates visible appearance", async () => {
  const storage = fixture();
  await render(
    <ThemeProvider scope="local:a" storage={storage}>
      <AppearanceControls />
      <Mode />
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled(),
  );
  expect(screen.getByRole("button", { name: "System" })).toBeSelected();
  await fireEvent.press(screen.getByRole("button", { name: "Light" }));
  await waitFor(() =>
    expect(screen.getByText("Appearance saved.")).toBeVisible(),
  );
  expect(screen.getByRole("button", { name: "Light" })).toBeSelected();
  expect(screen.getByText("Mode light")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Dark" }));
  await waitFor(() => expect(screen.getByText("Mode dark")).toBeVisible());
});
it("does not claim a failed write saved and allows retrying the selected option", async () => {
  const storage = fixture();
  storage.setItem.mockRejectedValueOnce(Error("private disk detail"));
  await render(
    <ThemeProvider scope="local:a" storage={storage}>
      <AppearanceControls />
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Light" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn’t save/),
  );
  expect(screen.queryByText("Appearance saved.")).toBeNull();
  expect(screen.queryByText("private disk detail")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Light" }));
  await waitFor(() =>
    expect(screen.getByText("Appearance saved.")).toBeVisible(),
  );
});
it("offers safe reload after read failure and never shows an old account's saved confirmation", async () => {
  const storage = fixture();
  storage.getItem.mockRejectedValueOnce(Error("read"));
  const view = await render(
    <ThemeProvider scope="local:a" storage={storage}>
      <AppearanceControls />
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Reload appearance" }),
    ).toBeVisible(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Reload appearance" }),
  );
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  await fireEvent.press(screen.getByRole("button", { name: "Light" }));
  await waitFor(() =>
    expect(screen.getByText("Appearance saved.")).toBeVisible(),
  );
  await view.rerender(
    <ThemeProvider scope="local:b" storage={storage}>
      <AppearanceControls />
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled(),
  );
  expect(screen.queryByText("Appearance saved.")).toBeNull();
});
it("announces hydration/saving and disables controls during shared or storage operations", async () => {
  const base: ThemeState = {
    scope: "test",
    colors: darkColors,
    mode: "dark",
    preference: "system",
    hydrating: true,
    saving: false,
    error: "",
    setPreference: jest.fn(async () => {}),
    retry: jest.fn(),
  };
  const view = await render(
    <ThemeContext.Provider value={base}>
      <AppearanceControls />
    </ThemeContext.Provider>,
  );
  expect(screen.getByText("Loading appearance…")).toBeVisible();
  expect(screen.getByRole("button", { name: "Light" })).toBeDisabled();
  await view.rerender(
    <ThemeContext.Provider value={{ ...base, hydrating: false, saving: true }}>
      <AppearanceControls />
    </ThemeContext.Provider>,
  );
  expect(screen.getByText("Saving appearance…")).toBeVisible();
  await view.rerender(
    <ThemeContext.Provider value={{ ...base, hydrating: false }}>
      <AppearanceControls disabled />
    </ThemeContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Dark" })).toBeDisabled();
  await act(async () => {});
});
