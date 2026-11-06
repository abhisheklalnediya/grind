import { previousForSet, previousSchema } from "./previous";

const id = "10000000-0000-4000-8000-000000000001";
it("matches warm-up and working ordinals separately and leaves unmatched values blank", () => {
  const previous = previousSchema.parse({
    session_id: id,
    finished_at: "2026-10-27T12:00:00Z",
    sets: [
      {
        set_type: "warmup",
        ordinal: 0,
        entered_load: "20",
        entered_unit: "kg",
        reps: 12,
      },
      {
        set_type: "working",
        ordinal: 0,
        entered_load: "60",
        entered_unit: "kg",
        reps: 8,
      },
      {
        set_type: "working",
        ordinal: 1,
        entered_load: "62.5",
        entered_unit: "kg",
        reps: 6,
      },
    ],
  });
  expect(previousForSet(null, "working", 0)).toBeNull();
  expect(previousForSet(previous, "working", 0)?.entered_load).toBe("60");
  expect(previousForSet(previous, "warmup", 0)?.entered_load).toBe("20");
  expect(previousForSet(previous, "working", 1)?.reps).toBe(6);
  expect(previousForSet(previous, "working", 2)).toBeNull();
  expect(
    previousSchema.safeParse({ session_id: id, finished_at: "bad", sets: [] })
      .success,
  ).toBe(false);
  expect(previousSchema.parse(null)).toBeNull();
});
it("retains previous timed and distance measurements", () => {
  const previous = previousSchema.parse({
    session_id: id,
    finished_at: "2026-10-27T12:00:00Z",
    sets: [
      {
        set_type: "working",
        ordinal: 0,
        entered_load: null,
        entered_unit: "kg",
        reps: null,
        duration_seconds: 600,
        entered_distance: "2.500",
        distance_unit: "mi",
      },
    ],
  });
  expect(previousForSet(previous, "working", 0)).toMatchObject({
    duration_seconds: 600,
    entered_distance: "2.500",
    distance_unit: "mi",
  });
});
it("matches previous performance only for the same exact set type and ordinal", () => {
  const setTypes = ["warmup", "working", "drop", "failure", "rest_pause"] as const;
  const previous = previousSchema.parse({
    session_id: id,
    finished_at: "2026-10-27T12:00:00Z",
    sets: setTypes.map((set_type, ordinal) => ({
      set_type,
      ordinal: 0,
      entered_load: String((ordinal + 1) * 10),
      entered_unit: "kg",
      reps: 8,
    })),
  });
  for (const [ordinal, setType] of setTypes.entries()) {
    const otherType = setTypes.find((candidate) => candidate !== setType) ?? "warmup";
    expect(previousForSet(previous, setType, 0)?.entered_load).toBe(
      String((ordinal + 1) * 10),
    );
    expect(previousForSet(previous, setType, 1)).toBeNull();
    expect(previousForSet(previous, otherType, 0)?.set_type).toBe(otherType);
  }
});
