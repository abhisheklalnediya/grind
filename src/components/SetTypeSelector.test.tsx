import { fireEvent, render, screen } from "@testing-library/react-native";
import { SetTypeSelector, type SetTypeOption } from "./SetTypeSelector";

const options: SetTypeOption[] = [
  { value: "working", label: "Working set", shortLabel: "W" },
  { value: "warmup", label: "Warm-up set", shortLabel: "WU" },
];

it("announces the current type and selects an accessible option", async () => {
  const onSelect = jest.fn();
  const view = await render(
    <SetTypeSelector value="working" options={options} onSelect={onSelect} />,
  );
  const trigger = screen.getByRole("button", { name: "Set type: Working set" });
  expect(trigger).toHaveStyle({ minHeight: 48, minWidth: 48 });
  expect(screen.getByText("W")).toBeTruthy();

  await fireEvent.press(trigger);
  const selected = screen.getByRole("button", { name: "Working set" });
  expect(selected).toHaveProp("accessibilityState", { selected: true });
  expect(screen.getByRole("button", { name: "Warm-up set" })).toHaveProp(
    "accessibilityState",
    { selected: false },
  );
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveStyle({
    minHeight: 48,
  });

  await fireEvent.press(screen.getByRole("button", { name: "Warm-up set" }));
  expect(onSelect).toHaveBeenCalledWith("warmup");
  expect(screen.queryByText("Choose set type")).toBeNull();

  await view.rerender(
    <SetTypeSelector value="warmup" options={options} onSelect={onSelect} />,
  );
  expect(
    screen.getByRole("button", { name: "Set type: Warm-up set" }),
  ).toBeTruthy();
});

it("closes without selecting when cancelled or dismissed by system back", async () => {
  const onSelect = jest.fn();
  await render(
    <SetTypeSelector value="working" options={options} onSelect={onSelect} />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Working set" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByText("Choose set type")).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();

  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Working set" }),
  );
  const modal = screen.getByTestId("set-type-modal");
  await fireEvent(modal, "requestClose");
  expect(screen.queryByText("Choose set type")).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();
});

it("offers optional additional set actions from the same sheet", async () => {
  const onMore = jest.fn();
  await render(
    <SetTypeSelector
      value="working"
      options={options}
      onSelect={jest.fn()}
      onMore={onMore}
      moreLabel="Move or remove set"
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Working set" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Move or remove set" }),
  );
  expect(onMore).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Choose set type")).toBeNull();
});

it("asks before changing a completed set and preserves it on cancel", async () => {
  const onSelect = jest.fn();
  await render(
    <SetTypeSelector
      value="working"
      options={options}
      onSelect={onSelect}
      completed
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Working set" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Warm-up set" }));
  expect(
    screen.getByText("Change completed set to Warm-up set?"),
  ).toBeVisible();
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Working set" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Warm-up set" }));
  await fireEvent.press(screen.getByRole("button", { name: "Change type" }));
  expect(onSelect).toHaveBeenCalledWith("warmup");
});

it("displays a preserved legacy value without offering it as a new choice", async () => {
  const onSelect = jest.fn();
  await render(
    <SetTypeSelector
      value="rest_pause"
      options={options}
      currentOption={{
        value: "rest_pause",
        label: "Rest-pause set",
        shortLabel: "RP",
      }}
      onSelect={onSelect}
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Set type: Rest-pause set" }),
  );
  expect(screen.queryByRole("button", { name: "Rest-pause set" })).toBeNull();
  expect(screen.getByRole("button", { name: "Working set" })).toBeVisible();
  expect(onSelect).not.toHaveBeenCalled();
});
