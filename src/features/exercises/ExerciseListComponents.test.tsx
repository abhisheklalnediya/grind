import { BackHandler } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ExerciseFilter } from "./ExerciseFilter";
import { ExerciseListRow } from "./ExerciseListRow";
import { RepdbExerciseDetail } from "./RepdbExerciseDetail";

jest.mock("@/services/exercises", () => ({ exerciseImage: () => 12 }));

it("opens a filter, selects an option and announces its value", async () => {
  const change = jest.fn();
  const view = await render(
    <ExerciseFilter
      label="Muscle"
      value=""
      options={["biceps_brachii"]}
      onChange={change}
    />,
  );
  await fireEvent.press(screen.getByLabelText("Muscle filter"));
  await fireEvent.press(screen.getByText("biceps brachii"));
  expect(change).toHaveBeenCalledWith("biceps_brachii");
  await view.rerender(
    <ExerciseFilter
      label="Muscle"
      value="biceps_brachii"
      options={["biceps_brachii"]}
      onChange={change}
    />,
  );
  expect(
    screen.getByLabelText("Muscle filter").props.accessibilityValue.text,
  ).toBe("biceps brachii");
  await fireEvent.press(screen.getByLabelText("Muscle filter"));
  await fireEvent.press(screen.getByLabelText("Close Muscle filter"));
});
it("shows a placeholder after an image fails and retains row action", async () => {
  const press = jest.fn();
  await render(
    <ExerciseListRow
      name="Curl"
      subtitle="Biceps · Barbell"
      image={12}
      onPress={press}
    />,
  );
  await fireEvent(screen.getByTestId("exercise-row-image"), "error");
  expect(screen.getByText("◇", { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Curl, Biceps · Barbell" }),
  );
  expect(press).toHaveBeenCalled();
});
it("handles image failure and hardware back in RepDB detail", async () => {
  const back = jest.fn();
  const listener = jest.spyOn(BackHandler, "addEventListener");
  await render(
    <RepdbExerciseDetail
      exercise={{
        id: "curl",
        name: "Curl",
        description: "Curl description",
        instructions: ["Curl it"],
        primaryMuscles: ["biceps_brachii"],
        secondaryMuscles: [],
        equipment: "barbell",
        synonyms: [],
      }}
      onBack={back}
    />,
  );
  await fireEvent(screen.getByTestId("exercise-detail-image"), "error");
  expect(screen.getByText("Illustration unavailable.")).toBeTruthy();
  const callback = listener.mock.calls[0]?.[1];
  expect(callback?.({ type: "hardwareBackPress", timeStamp: 0 })).toBe(true);
  expect(back).toHaveBeenCalled();
  listener.mockRestore();
});
