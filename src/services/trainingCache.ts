import type { QueryClient } from "@tanstack/react-query";
export async function invalidateTrainingHistory(query: QueryClient) {
  await Promise.all(
    ["history", "previous", "exercise-previous", "exercise-history"].map(
      (key) => query.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
