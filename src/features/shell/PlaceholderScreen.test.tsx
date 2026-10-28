import { render, screen } from "@testing-library/react-native";
import { PlaceholderScreen } from "./PlaceholderScreen";
it("communicates unavailable features without fabricated saved data", async () => {
  await render(
    <PlaceholderScreen
      title="History"
      description="Your completed workouts will appear here once workout logging is available."
    />,
  );
  expect(screen.getByRole("header", { name: "History" })).toBeVisible();
  expect(
    screen.getByText(
      "Your completed workouts will appear here once workout logging is available.",
    ),
  ).toBeVisible();
});
