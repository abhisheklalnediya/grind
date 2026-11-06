import { workoutCommandSchema } from "./commands";

const id = "10000000-0000-4000-8000-000000000001";
it("validates each mutation's stable IDs and rejects malformed or authority-bearing payloads", () => {
  const commands = [
    { type: "rename_workout", name: "Push" },
    {
      type: "add_exercise",
      id,
      exercise_id: id,
      position: 0,
      load_mode: "weighted_bodyweight",
      notes: "",
      rest_seconds: 120,
    },
    {
      type: "update_exercise",
      exercise_id: id,
      notes: "Control return",
      rest_seconds: 90,
    },
    { type: "remove_exercise", exercise_id: id },
    { type: "reorder_exercises", ids: [id] },
    {
      type: "upsert_set",
      exercise_id: id,
      set: {
        id,
        position: 0,
        set_type: "working",
        entered_load: "20",
        entered_unit: "kg",
        reps: 8,
      },
    },
    { type: "remove_set", exercise_id: id, set_id: id },
    { type: "reorder_sets", exercise_id: id, ids: [id] },
    { type: "complete_set", exercise_id: id, set_id: id, completed: true },
  ];
  for (const command of commands) {
    expect(workoutCommandSchema.safeParse(command).success).toBe(true);
    expect(
      workoutCommandSchema.safeParse({ ...command, owner_id: id }).success,
    ).toBe(false);
  }
  expect(
    workoutCommandSchema.safeParse({ type: "reorder_exercises", ids: [id, id] })
      .success,
  ).toBe(false);
  expect(
    workoutCommandSchema.safeParse({
      type: "remove_set",
      exercise_id: id,
      set_id: "bad",
    }).success,
  ).toBe(false);
  expect(
    workoutCommandSchema.safeParse({
      type: "complete_set",
      exercise_id: id,
      set_id: id,
      completed: "yes",
    }).success,
  ).toBe(false);
});
it("accepts measured commands and rejects invalid measurement values", () => {
  const command = {
    type: "upsert_set",
    exercise_id: id,
    set: {
      id,
      position: 0,
      set_type: "working",
      entered_load: null,
      entered_unit: "kg",
      reps: null,
      duration_seconds: 120,
      entered_distance: "1.250",
      distance_unit: "km",
    },
  };
  expect(workoutCommandSchema.parse(command)).toEqual(command);
  expect(
    workoutCommandSchema.safeParse({
      ...command,
      set: { ...command.set, entered_distance: "-1" },
    }).success,
  ).toBe(false);
  expect(
    workoutCommandSchema.safeParse({
      type: "add_exercise",
      id,
      exercise_id: id,
      position: 0,
      load_mode: "bodyweight",
      tracking_type: "duration",
      notes: "",
      rest_seconds: 120,
    }).success,
  ).toBe(true);
});
it("accepts each exact set type through the upsert command contract", () => {
  const setTypes = ["warmup", "working", "drop", "failure", "rest_pause"] as const;
  for (const set_type of setTypes) {
    const result = workoutCommandSchema.safeParse({
      type: "upsert_set",
      exercise_id: id,
      set: {
        id,
        position: 0,
        set_type,
        entered_load: "20",
        entered_unit: "kg",
        reps: 8,
      },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "upsert_set")
      expect(result.data.set.set_type).toBe(set_type);
  }
});
