import {
  customExercisePayloadSchema,
  exerciseSchema,
  historyPageSchema,
  isConfiguredExercise,
  routinePayloadSchema,
  routineSchema,
  sessionSchema,
  templateExerciseSchema,
  workoutExerciseSchema,
} from "./schemas";

const id = "10000000-0000-4000-8000-000000000001";
const time = "2026-10-27T12:00:00Z";
const set = {
  id,
  position: 0,
  set_type: "working",
  entered_load: "20",
  entered_unit: "kg",
  reps: 8,
};
const template = {
  id,
  exercise_id: id,
  position: 0,
  load_mode: "external",
  notes: "",
  rest_seconds: 120,
  sets: [set],
};
const workoutExercise = {
  ...template,
  name: "Pull-up",
  load_convention: "Added external load",
  sets: [{ ...set, completed_at: null }],
};
const session = {
  id,
  status: "active",
  name: "Workout",
  started_at: time,
  finished_at: null,
  timezone: "UTC",
  revision: 0,
  source_routine_id: null,
  exercises: [workoutExercise],
};
const custom = {
  name: "Pull-up",
  primary_muscle: "Back",
  equipment: "Bodyweight",
  category: "Strength",
  load_convention: "Reps only",
  load_mode: "bodyweight",
};
it("validates full session/routine/catalog/page graphs and strips server-only extras", () => {
  expect(sessionSchema.parse(session).exercises[0]?.sets[0]?.entered_load).toBe(
    "20",
  );
  expect(sessionSchema.parse({ ...session, exercises: [] }).exercises).toEqual(
    [],
  );
  expect(
    historyPageSchema.parse({
      items: [session],
      next_cursor: { id, finished_at: time },
    }).items,
  ).toHaveLength(1);
  expect(
    historyPageSchema.parse({ items: [], next_cursor: null }).next_cursor,
  ).toBeNull();
  expect(
    routineSchema.parse({
      id,
      version: 1,
      archived_at: null,
      name: "Push",
      exercises: [template],
      user_id: id,
    }),
  ).not.toHaveProperty("user_id");
  expect(routinePayloadSchema.parse({ name: "Push", exercises: [] }).name).toBe(
    "Push",
  );
  expect(customExercisePayloadSchema.parse(custom).load_mode).toBe(
    "bodyweight",
  );
  const definition = {
    ...custom,
    id,
    origin: "custom",
    owner_id: id,
    archived_at: null,
    created_at: time,
  };
  expect(
    exerciseSchema.parse({ ...definition, internal_field: "ignored" }),
  ).not.toHaveProperty("internal_field");
  expect(
    exerciseSchema.safeParse({ ...definition, owner_id: null }).success,
  ).toBe(false);
  expect(
    exerciseSchema.safeParse({ ...definition, origin: "grind", owner_id: null })
      .success,
  ).toBe(true);
  expect(
    exerciseSchema.safeParse({ ...definition, origin: "grind" }).success,
  ).toBe(false);
});
it("accepts all exact set types in legacy stored workout and routine rows", () => {
  const setTypes = ["warmup", "working", "drop", "failure", "rest_pause"] as const;
  for (const set_type of setTypes) {
    const routine = routinePayloadSchema.parse({
      name: "Strength",
      exercises: [{ ...template, sets: [{ ...set, set_type }] }],
    });
    expect(routine.exercises[0]?.sets[0]?.set_type).toBe(set_type);
    const stored = sessionSchema.parse({
      ...session,
      exercises: [{
        ...workoutExercise,
        sets: [{ ...set, set_type, completed_at: null }],
      }],
    });
    expect(stored.exercises[0]?.sets[0]?.set_type).toBe(set_type);
  }
  expect(
    sessionSchema.safeParse({
      ...session,
      exercises: [{
        ...workoutExercise,
        sets: [{ ...set, set_type: "warm-up", completed_at: null }],
      }],
    }).success,
  ).toBe(false);
});
it("rejects extra mutation authority, invalid ranges and invalid completed values", () => {
  expect(
    customExercisePayloadSchema.safeParse({ ...custom, owner_id: id }).success,
  ).toBe(false);
  expect(
    routinePayloadSchema.safeParse({
      name: "Push",
      exercises: [template],
      owner_id: id,
    }).success,
  ).toBe(false);
  expect(sessionSchema.safeParse({ ...session, revision: -1 }).success).toBe(
    false,
  );
  expect(
    sessionSchema.safeParse({
      ...session,
      exercises: Array.from({ length: 101 }, () => workoutExercise),
    }).success,
  ).toBe(false);
  expect(
    workoutExerciseSchema.safeParse({
      ...workoutExercise,
      sets: [{ ...set, completed_at: time }],
    }).success,
  ).toBe(true);
  expect(
    workoutExerciseSchema.safeParse({
      ...workoutExercise,
      sets: [{ ...set, reps: null, completed_at: time }],
    }).success,
  ).toBe(false);
  expect(
    workoutExerciseSchema.safeParse({
      ...workoutExercise,
      sets: [{ ...set, entered_load: null, reps: null, completed_at: null }],
    }).success,
  ).toBe(true);
});
it("keeps bodyweight and positive assistance semantics for targets and saved rows", () => {
  for (const schema of [templateExerciseSchema, workoutExerciseSchema]) {
    const base = schema === templateExerciseSchema ? template : workoutExercise;
    expect(schema.safeParse({ ...base, load_mode: "bodyweight" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        ...base,
        load_mode: "bodyweight",
        sets: [{ ...set, entered_load: null, completed_at: null }].map(
          ({ completed_at, ...row }) =>
            schema === templateExerciseSchema ? row : { ...row, completed_at },
        ),
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...base,
        load_mode: "assisted",
        sets: [{ ...set, entered_load: "0", completed_at: null }].map(
          ({ completed_at, ...row }) =>
            schema === templateExerciseSchema ? row : { ...row, completed_at },
        ),
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        load_mode: "assisted",
        sets: [{ ...set, entered_load: null, completed_at: null }].map(
          ({ completed_at, ...row }) =>
            schema === templateExerciseSchema ? row : { ...row, completed_at },
        ),
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ ...base, load_mode: "assisted" }).success).toBe(
      true,
    );
  }
});
it("preserves timed measurements while accepting legacy graphs", () => {
  const measured = {
    ...set,
    entered_load: null,
    reps: null,
    duration_seconds: 300,
    entered_distance: "1.250",
    distance_unit: "mi",
    completed_at: time,
  };
  const timed = {
    ...workoutExercise,
    tracking_type: "distance_duration",
    sets: [measured],
  };
  expect(workoutExerciseSchema.parse(timed).sets[0]?.entered_distance).toBe(
    "1.250",
  );
  expect(
    workoutExerciseSchema.safeParse({
      ...timed,
      sets: [{ ...measured, distance_unit: null }],
    }).success,
  ).toBe(false);
  expect(
    workoutExerciseSchema.safeParse({
      ...timed,
      sets: [{ ...measured, duration_seconds: null }],
    }).success,
  ).toBe(false);
  expect(workoutExerciseSchema.safeParse(workoutExercise).success).toBe(true);
  expect(
    templateExerciseSchema.parse({
      ...template,
      tracking_type: "duration",
      sets: [{ ...set, duration_seconds: 45 }],
    }).tracking_type,
  ).toBe("duration");
});

it("accepts unconfigured provider rows without inventing logging semantics", () => {
  const base = {
    ...custom,
    id,
    origin: "provider",
    owner_id: null,
    archived_at: null,
    created_at: time,
  };
  const unconfigured = {
    ...base,
    is_configured: false,
    load_mode: null,
    load_convention: null,
    tracking_type: null,
  };
  const parsed = exerciseSchema.parse(unconfigured);
  expect(isConfiguredExercise(parsed)).toBe(false);
  expect(isConfiguredExercise(exerciseSchema.parse(base))).toBe(true);
  expect(
    exerciseSchema.safeParse({
      ...unconfigured,
      origin: "custom",
      owner_id: id,
    }).success,
  ).toBe(false);
  expect(
    exerciseSchema.safeParse({ ...unconfigured, load_mode: "external" })
      .success,
  ).toBe(false);
  expect(
    exerciseSchema.safeParse({ ...unconfigured, load_convention: "Weight" })
      .success,
  ).toBe(false);
  expect(
    exerciseSchema.safeParse({ ...unconfigured, tracking_type: "reps" })
      .success,
  ).toBe(false);
  expect(exerciseSchema.safeParse({ ...base, load_mode: null }).success).toBe(
    false,
  );
  expect(
    exerciseSchema.safeParse({ ...base, load_convention: null }).success,
  ).toBe(false);
  expect(
    exerciseSchema.safeParse({ ...base, tracking_type: null }).success,
  ).toBe(false);
});
