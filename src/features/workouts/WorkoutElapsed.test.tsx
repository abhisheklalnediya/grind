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
  expect(screen.getByText("Elapsed 1:05")).toBeTruthy();
  await act(() => {
    jest.setSystemTime(new Date("2026-10-28T12:06:09Z"));
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText("Elapsed 6:10")).toBeTruthy();
  await view.unmount();
  expect(clear).toHaveBeenCalled();
  clear.mockRestore();
});
it("clamps a future start to zero", async () => {
  await render(<WorkoutElapsed startedAt="2026-10-28T13:00:00Z" />);
  expect(screen.getByText("Elapsed 0:00")).toBeTruthy();
});
