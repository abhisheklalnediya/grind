import { fireEvent, render, screen } from "@testing-library/react-native";
import { LoadUnitControl } from "./LoadUnitControl";
it("changes only empty entry units and converts populated loads for display without writes", async () => {
  const change = jest.fn();
  const view = await render(
    <LoadUnitControl load={null} unit="kg" onChangeUnit={change} />,
  );
  await fireEvent.press(screen.getByText("Use lb"));
  expect(change).toHaveBeenCalledWith("lb");
  change.mockClear();
  await view.rerender(
    <LoadUnitControl load="100" unit="kg" onChangeUnit={change} />,
  );
  await fireEvent.press(screen.getByText("View in lb"));
  expect(screen.getByText("220.462 lb · entered in kg")).toBeVisible();
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("View in lb"));
  expect(screen.queryByText(/entered in/)).toBeNull();
  await view.rerender(
    <LoadUnitControl load="100" unit="lb" onChangeUnit={change} />,
  );
  await fireEvent.press(screen.getByText("View in kg"));
  expect(screen.getByText("45.359 kg · entered in lb")).toBeVisible();
  await view.rerender(
    <LoadUnitControl load="72." unit="kg" onChangeUnit={change} />,
  );
  expect(screen.getByRole("button", { name: "View in lb" })).toBeDisabled();
  await view.rerender(
    <LoadUnitControl load="" unit="lb" onChangeUnit={change} />,
  );
  await fireEvent.press(screen.getByText("Use kg"));
  expect(change).toHaveBeenCalledWith("kg");
});
it("contextualizes unit actions while preserving their visible labels", async () => {
  const view = await render(
    <LoadUnitControl
      load=""
      unit="kg"
      accessibilityContext="Bench set 2"
      onChangeUnit={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Bench set 2: Use lb" }),
  ).toBeTruthy();
  await view.rerender(
    <LoadUnitControl
      load="20"
      unit="kg"
      accessibilityContext="Bench set 2"
      onChangeUnit={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Bench set 2: View in lb" }),
  ).toBeTruthy();
  expect(screen.getByText("View in lb")).toBeTruthy();
});
