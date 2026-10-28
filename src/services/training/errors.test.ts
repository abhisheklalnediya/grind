import { TrainingError, trainingFailure } from "./errors";
it("classifies auth, conflict, validation and retryable network failures safely", () => {
  for (const [status, code, kind] of [
    [401, undefined, "auth"],
    [403, undefined, "auth"],
    [400, "42501", "auth"],
    [400, "PGRST301", "auth"],
    [409, "40001", "conflict"],
    [409, "PT409", "conflict"],
    [409, "23514", "validation"],
    [409, "23505", "validation"],
    [400, undefined, "validation"],
    [503, "private SQL error", "network"],
  ] as const) {
    const error = trainingFailure(status, code);
    expect(error.kind).toBe(kind);
    expect(error.message).not.toContain("private SQL");
  }
  expect(new TrainingError("response").message).toContain("safely");
});
