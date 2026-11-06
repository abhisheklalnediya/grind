import { Platform, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "./Button";
import { Heading } from "./Heading";
import { Screen } from "./Screen";
import { Panel } from "./Panel";
import { ThemeContext, type ThemeState } from "@/theme/useTheme";
import { darkColors, lightColors } from "@/theme/tokens";
afterEach(() => jest.restoreAllMocks());
function theme(mode: "dark" | "light"): ThemeState {
  return {
    scope: "test",
    colors: mode === "light" ? lightColors : darkColors,
    mode,
    preference: mode,
    setPreference: async () => {},
    retry: () => {},
    error: "",
    hydrating: false,
    saving: false,
  };
}
it("exposes button states, dispatches enabled actions and uses readable primary/secondary/disabled treatments", async () => {
  const press = jest.fn();
  const view = await render(<Button label="Save" onPress={press} />);
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Save" })).toHaveStyle({
    minHeight: 50,
    backgroundColor: darkColors.accent,
  });
  expect(screen.getByText("Save")).toHaveStyle({ color: darkColors.onAccent });
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(press).toHaveBeenCalledTimes(1);
  await view.rerender(
    <ThemeContext.Provider value={theme("light")}>
      <Button label="Save" onPress={press} secondary selected />
    </ThemeContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Save" })).toHaveStyle({
    backgroundColor: lightColors.surface,
    borderColor: lightColors.border,
  });
  expect(screen.getByText("Save")).toHaveStyle({ color: lightColors.text });
  await view.rerender(
    <ThemeContext.Provider value={theme("light")}>
      <Button label="Save" onPress={press} disabled />
    </ThemeContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByText("Save")).toHaveStyle({
    color: lightColors.disabledText,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(press).toHaveBeenCalledTimes(1);
});
it("renders semantic headings and optional copy with contrast-safe light accent text", async () => {
  const view = await render(
    <ThemeContext.Provider value={theme("light")}>
      <Heading title="Train" subtitle="Your work" />
    </ThemeContext.Provider>,
  );
  expect(screen.getByRole("header", { name: "Train" })).toHaveStyle({
    color: lightColors.text,
  });
  expect(screen.getByText("GRIND")).toHaveStyle({
    color: lightColors.accentText,
  });
  expect(screen.getByText("Your work")).toHaveStyle({
    color: lightColors.secondary,
  });
  await view.rerender(<Heading title="History" />);
  expect(screen.queryByText("Your work")).toBeNull();
});
it("keeps content in safe areas, uses keyboard avoidance on both platforms and updates its background", async () => {
  const original = Platform.OS;
  const property = jest.replaceProperty(Platform, "OS", "ios");
  const view = await render(
    <ThemeContext.Provider value={theme("light")}>
      <Screen>
        <Text>Content</Text>
      </Screen>
    </ThemeContext.Provider>,
  );
  expect(screen.getByText("Content")).toBeVisible();
  expect(screen.getByTestId("screen-safe-area").props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ backgroundColor: lightColors.background }),
    ]),
  );
  expect(screen.getByText("Content")).toBeVisible();
  property.replaceValue("android");
  await view.rerender(
    <Screen>
      <Text>Content</Text>
    </Screen>,
  );
  expect(screen.getByText("Content")).toBeVisible();
  property.replaceValue(original);
  property.restore();
});
it("allows concise button text with a contextual accessible name", async () => {
  const press = jest.fn();
  await render(
    <Button
      label="Complete set"
      accessibilityLabel="Bench set 2: Complete set"
      onPress={press}
    />,
  );
  expect(screen.getByText("Complete set")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Bench set 2: Complete set" }),
  );
  expect(press).toHaveBeenCalledTimes(1);
});

it("renders a quiet text action with an accessible target", async () => {
  const press = jest.fn();
  await render(<Button label="Add set" tertiary onPress={press} />);
  expect(screen.getByRole("button", { name: "Add set" })).toHaveStyle({
    minHeight: 50,
    backgroundColor: "transparent",
  });
  expect(screen.getByText("Add set")).toHaveStyle({
    color: darkColors.accentText,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Add set" }));
  expect(press).toHaveBeenCalled();
});

it("supports a muted quiet navigation action", async () => {
  await render(<Button label="Back" tertiary muted onPress={() => {}} />);
  expect(screen.getByText("Back")).toHaveStyle({ color: darkColors.secondary });
});

it("renders panel content using the active theme", async () => {
  await render(
    <ThemeContext.Provider value={theme("light")}>
      <Panel>
        <Text>Routine exercise</Text>
      </Panel>
    </ThemeContext.Provider>,
  );
  expect(screen.getByText("Routine exercise")).toBeVisible();
});
