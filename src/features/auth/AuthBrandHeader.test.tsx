import { render, screen } from "@testing-library/react-native";
import { AuthBrandHeader } from "./AuthBrandHeader";

it("presents the GRIND lockup and accessible page heading", async () => {
  await render(
    <AuthBrandHeader title="Welcome back." subtitle="Sign in to your Grind account." />,
  );
  expect(screen.getByRole("image", { name: "GRIND Gym Logger" })).toBeVisible();
  expect(screen.getByRole("header", { name: "Welcome back." })).toBeVisible();
  expect(screen.getByText("Sign in to your Grind account.")).toBeVisible();
});

it("supports concise status pages without inventing subtitle copy", async () => {
  await render(<AuthBrandHeader title="Checking your link…" />);
  expect(screen.getByRole("header", { name: "Checking your link…" })).toBeVisible();
  expect(screen.queryByText("Sign in to your Grind account.")).toBeNull();
});
