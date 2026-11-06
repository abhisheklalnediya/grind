import { act, render, screen } from "@testing-library/react-native";
import { WorkoutElapsed } from "./WorkoutElapsed";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-28T12:01:05Z"));
});
afterEach(() => jest.useRealTimers());
it("shows elapsed wall-clock time, catches up and cleans up its interval", async () => {
  const clear = jest.spyOn(global, "clearInterval");
  const view = await render(
    <WorkoutElapsed startedAt="2026-10-28T12:00:00Z" />,
  );
  expect(screen.getByText("1:05 elapsed")).toBeTruthy();
  await act(() => {
    jest.setSystemTime(new Date("2026-10-28T12:06:09Z"));
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText("6:10 elapsed")).toBeTruthy();
  await view.unmount();
  expect(clear).toHaveBeenCalled();
  clear.mockRestore();
});
it("clamps a future start to zero", async () => {
  await render(<WorkoutElapsed startedAt="2026-10-28T13:00:00Z" />);
  expect(screen.getByText("0:00 elapsed")).toBeTruthy();
});

it("shows hours for long-running sessions without changing elapsed time", async () => {
  await render(<WorkoutElapsed startedAt="2026-10-27T10:00:00Z" />);
  expect(screen.getByText("26:01:05 elapsed")).toBeVisible();
});
