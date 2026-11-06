import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useTraining } from "@/features/training";
import { useSupportedSetTypes } from "./useSupportedSetTypes";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
function ViewTypes() {
  return <Text>{useSupportedSetTypes().join(",")}</Text>;
}
async function mount(api: unknown) {
  jest
    .mocked(useTraining)
    .mockReturnValue({ api } as ReturnType<typeof useTraining>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ViewTypes />
    </QueryClientProvider>,
  );
}
it("offers only legacy types until the backend confirms new types", async () => {
  let resolve: (v: string[]) => void = () => {};
  const supportedSetTypes = jest.fn(
    () =>
      new Promise<string[]>((r) => {
        resolve = r;
      }),
  );
  await mount({ supportedSetTypes });
  expect(screen.getByText("warmup,working")).toBeVisible();
  resolve(["warmup", "working", "drop", "failure", "rest_pause"]);
  expect(await screen.findByText("warmup,working,drop,failure")).toBeVisible();
  expect(screen.queryByText(/rest_pause/)).toBeNull();
});
it("falls back safely when the RPC is absent, fails or omits required legacy types", async () => {
  for (const api of [
    null,
    {},
    { supportedSetTypes: jest.fn().mockRejectedValue(Error("unavailable")) },
    { supportedSetTypes: jest.fn().mockResolvedValue(["drop"]) },
  ]) {
    const view = await mount(api);
    expect(await screen.findByText("warmup,working")).toBeVisible();
    await view.unmount();
  }
});
