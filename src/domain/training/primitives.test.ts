import {
  decimalLoadSchema,
  loadModeSchema,
  nameSchema,
  notesSchema,
  positionSchema,
  repsSchema,
  restSchema,
  timestampSchema,
  unitSchema,
} from "./primitives";

it("validates bounded strings, integer ranges, modes, units and timestamps", () => {
  expect(decimalLoadSchema.parse("100000.000")).toBe("100000.000");
  for (const bad of [
    "100000.001",
    "100001",
    "1.2345",
    "-1",
    "1e4",
    "",
    "x",
    "0".repeat(33),
  ])
    expect(decimalLoadSchema.safeParse(bad).success).toBe(false);
  expect(nameSchema.parse("  Pull-up  ")).toBe("Pull-up");
  expect(nameSchema.safeParse(" ").success).toBe(false);
  expect(nameSchema.safeParse("x".repeat(81)).success).toBe(false);
  expect(notesSchema.safeParse("x".repeat(2001)).success).toBe(false);
  for (const [schema, good, bad] of [
    [positionSchema, 99, 100],
    [repsSchema, 10000, 0],
    [restSchema, 120, 14],
  ] as const) {
    expect(schema.safeParse(good).success).toBe(true);
    expect(schema.safeParse(bad).success).toBe(false);
  }
  expect(loadModeSchema.options).toEqual([
    "external",
    "bodyweight",
    "assisted",
    "weighted_bodyweight",
  ]);
  expect(loadModeSchema.safeParse("spotter").success).toBe(false);
  expect(unitSchema.safeParse("stone").success).toBe(false);
  expect(timestampSchema.safeParse("2026-10-27T12:00:00+00:00").success).toBe(
    true,
  );
  expect(timestampSchema.safeParse("yesterday").success).toBe(false);
});
