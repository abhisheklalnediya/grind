import {
  decimalLoadSchema,
  distanceSchema,
  durationSchema,
  distanceUnitSchema,
  trackingTypeSchema,
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
it("bounds timed and distance measurements and their units", () => {

  for (const value of [".001", "100000", "1.250"])
    expect(distanceSchema.safeParse(value).success).toBe(true);
  for (const value of [
    "0",
    "100000.001",
    "1.0000",
    "-1",
    "1e2",
    "0".repeat(33),
  ])
    expect(distanceSchema.safeParse(value).success).toBe(false);
  for (const value of [1, 86400])
    expect(durationSchema.safeParse(value).success).toBe(true);
  for (const value of [0, 86401, 1.5])
    expect(durationSchema.safeParse(value).success).toBe(false);
  expect(distanceUnitSchema.safeParse("mi").success).toBe(true);
  expect(distanceUnitSchema.safeParse("meters").success).toBe(false);
  expect(trackingTypeSchema.safeParse("distance_duration").success).toBe(true);
  expect(trackingTypeSchema.safeParse("time").success).toBe(false);
});
