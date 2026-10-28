import { Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { scopedSettings } from "@/services/scopedSettings";
import { TrainingDefaultsProvider, useTrainingDefaults } from "./index";
jest.mock("@/services/scopedSettings", () => ({ scopedSettings: jest.fn() }));
const load = jest.fn();
function Probe() {
  const defaults = useTrainingDefaults();
  return (
    <>
      <Text>{`${defaults.unit}/${defaults.restSeconds}/${defaults.pending}/${defaults.error}`}</Text>
      <Button label="Retry" onPress={defaults.retry} />
    </>
  );
}
function mount(userId?: string, ready = true) {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  if (userId && ready)
    query.setQueryData(["grind-account", userId], {
      setup_completed_at: "now",
    });
  return {
    query,
    view: render(
      <QueryClientProvider client={query}>
        <TrainingDefaultsProvider {...(userId ? { userId } : {})}>
          <Probe />
        </TrainingDefaultsProvider>
      </QueryClientProvider>,
    ),
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(scopedSettings).mockReturnValue({ load, save: jest.fn() });
  load.mockResolvedValue({ preferred_unit: "lb", default_rest_seconds: 90 });
});
it("defaults safely outside provider and disables signed-out IO", async () => {
  await render(<Probe />);
  expect(screen.getByText("kg/120/false/")).toBeVisible();
  await mount().view;
  expect(load).not.toHaveBeenCalled();
  expect(scopedSettings).not.toHaveBeenCalled();
});
it("waits for setup and uses saved defaults with refetch on preference invalidation", async () => {
  const { query, view } = mount("user-a", false);
  await view;
  expect(load).not.toHaveBeenCalled();
  await act(async () => {
    query.setQueryData(["grind-account", "user-a"], {
      setup_completed_at: "now",
    });
  });
  expect(await screen.findByText("lb/90/false/")).toBeVisible();
  load.mockResolvedValue({ preferred_unit: "kg", default_rest_seconds: 180 });
  await act(async () => {
    await query.invalidateQueries({ queryKey: ["grind-settings"] });
  });
  expect(await screen.findByText("kg/180/false/")).toBeVisible();
});
it("shows a safe error and retries reads", async () => {
  load.mockRejectedValueOnce(Error("offline"));
  await mount("user-a").view;
  expect(
    await screen.findByText(/Couldn’t load training defaults/),
  ).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("lb/90/false/")).toBeVisible();
});
