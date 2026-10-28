import { draftPersistence } from "./outboxPersistence";
import { emptyDraft, type DraftStorage } from "./outboxState";
import { makeSession } from "../../../tests/fixtures/training";
function harness() {
  const data = new Map<string, string>();
  const storage: DraftStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return { data, persistence: draftPersistence("scope", storage) };
}
it("roundtrips pointer and scoped session documents, with no credentials", async () => {
  const { data, persistence } = harness();
  expect(await persistence.read()).toBeNull();
  await persistence.write(emptyDraft());
  expect(await persistence.read()).toEqual(emptyDraft());
  const draft = { ...emptyDraft(), session: makeSession() };
  await persistence.write(draft);
  expect(await persistence.read()).toEqual(draft);
  expect(data.get("grind.training.v1.scope.active")).toBe(makeSession().id);
});
it("rejects malformed, missing, oversized and mismatched documents without overwriting", async () => {
  for (const [suffix, value] of [
    ["invalid", "{}"],
    ["start", null],
    ["start", "bad json"],
    ["start", "x".repeat(1000001)],
    [makeSession().id, JSON.stringify(emptyDraft())],
    ["start", JSON.stringify({ wrong: true })],
  ] as const) {
    const { data, persistence } = harness();
    data.set("grind.training.v1.scope.active", suffix);
    if (value !== null) data.set(`grind.training.v1.scope.${suffix}`, value);
    await expect(persistence.read()).rejects.toThrow();
    expect(data.get("grind.training.v1.scope.active")).toBe(suffix);
  }
  const { persistence } = harness();
  await expect(
    persistence.write({
      ...emptyDraft(),
      raw: Object.fromEntries(
        Array.from({ length: 600 }, (_, i) => [String(i), "x".repeat(2000)]),
      ),
    }),
  ).rejects.toThrow();
});
