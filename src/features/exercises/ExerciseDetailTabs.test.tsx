import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  ExerciseDetailTabs,
  type ExerciseDetailTab,
} from "./ExerciseDetailTabs";

it("announces the active tab and reports selections", async () => {
  let selected: ExerciseDetailTab = "overview";
  const onSelect = jest.fn((tab: ExerciseDetailTab) => {
    selected = tab;
  });
  const view = await render(
    <ExerciseDetailTabs selected={selected} onSelect={onSelect} />,
  );

  expect(screen.getByTestId("exercise-detail-tabs").props.accessibilityRole).toBe(
    "tablist",
  );
  expect(screen.getByRole("tab", { name: "Overview" })).toBeSelected();
  expect(screen.getByRole("tab", { name: "History" })).not.toBeSelected();
  await fireEvent.press(screen.getByRole("tab", { name: "History" }));
  expect(onSelect).toHaveBeenCalledWith("history");

  selected = "history";
  await view.rerender(
    <ExerciseDetailTabs selected={selected} onSelect={onSelect} />,
  );
  expect(screen.getByRole("tab", { name: "History" })).toBeSelected();
  expect(screen.getByRole("tab", { name: "Overview" })).not.toBeSelected();
  await fireEvent.press(screen.getByRole("tab", { name: "Overview" }));
  expect(onSelect).toHaveBeenLastCalledWith("overview");
});
