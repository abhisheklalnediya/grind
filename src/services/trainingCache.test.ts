import { QueryClient } from "@tanstack/react-query";
import { invalidateTrainingHistory } from "./trainingCache";
it("invalidates every history/performance family after acknowledged completion", async () => {
  const query = new QueryClient();
  const invalidate = jest.spyOn(query, "invalidateQueries").mockResolvedValue();
  await invalidateTrainingHistory(query);
  expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
    ["history"],
    ["previous"],
    ["exercise-previous"],
    ["exercise-history"],
  ]);
});
