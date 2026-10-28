import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SetupScreen } from "./SetupScreen";
import { saveSettings } from "@/services/grindAccount";
jest.mock("@/services/grindAccount", () => ({ saveSettings: jest.fn() }));
it("does not mark setup complete on a failed server write and retries retained choices", async () => {
  const query = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  jest
    .mocked(saveSettings)
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce({
      user_id: "id",
      preferred_unit: "lb",
      default_rest_seconds: 90,
      updated_at: "now",
    });
  const invalidate = jest.spyOn(query, "invalidateQueries");
  await render(
    <QueryClientProvider client={query}>
      <SetupScreen />
    </QueryClientProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "lb" }));
  await fireEvent.press(screen.getByRole("button", { name: "90s" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
  expect(invalidate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(invalidate).toHaveBeenCalled());
  expect(saveSettings).toHaveBeenLastCalledWith("lb", 90, true);
});
