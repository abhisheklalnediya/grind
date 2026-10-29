import {
  canFinish,
  clearCommandRaw,
  commandTimer,
  draftSchema,
  emptyDraft,
  rawFieldKey,
} from "./outboxState";
import {
  makeSession,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
const exercise = {
  id: trainingId(5),
  exercise_id: trainingId(2),
  name: "Bench",
  load_convention: "Total",
  load_mode: "external" as const,
  position: 0,
  notes: "",
  rest_seconds: 60,
  sets: [makeSet()],
};
const session = { ...makeSession(), exercises: [exercise] };
it("only permits finishing complete, nonempty, valid workouts", () => {
  expect(canFinish(null)).toBe(false);
  expect(canFinish(makeSession())).toBe(false);
  expect(canFinish({ ...session, status: "completed" })).toBe(false);
  expect(
    canFinish({ ...session, exercises: [{ ...exercise, sets: [] }] }),
  ).toBe(false);
  expect(canFinish(session)).toBe(false);
  expect(
    canFinish({
      ...session,
      exercises: [
        {
          ...exercise,
          sets: [
            { ...makeSet(), reps: null, completed_at: "2026-10-27T00:00:00Z" },
          ],
        },
      ],
    }),
  ).toBe(false);
  expect(
    canFinish({
      ...session,
      exercises: [
        {
          ...exercise,
          sets: [{ ...makeSet(), completed_at: "2026-10-27T00:00:00Z" }],
        },
      ],
    }),
  ).toBe(true);
});
it("clears only committed raw fields and invalidated rest timers", () => {
  const key = rawFieldKey(exercise.id, makeSet().id, "load");
  const raw = { [key]: "72.", other: "8" };
  expect(clearCommandRaw(raw, { type: "reorder_exercises", ids: [] })).toBe(
    raw,
  );
  expect(
    clearCommandRaw(raw, { type: "remove_exercise", exercise_id: exercise.id }),
  ).toEqual({ other: "8" });
  expect(
    clearCommandRaw(raw, {
      type: "remove_set",
      exercise_id: exercise.id,
      set_id: makeSet().id,
    }),
  ).toEqual({ other: "8" });
  const { completed_at: _completed, ...set } = makeSet();
  expect(
    clearCommandRaw(raw, { type: "upsert_set", exercise_id: exercise.id, set }),
  ).toEqual({ other: "8" });
  const draft = { ...emptyDraft(), session };
  const complete = {
    type: "complete_set" as const,
    exercise_id: exercise.id,
    set_id: makeSet().id,
    completed: true,
  };
  const timer = commandTimer(draft, complete, 1000);
  expect(timer?.ends_at).toBe(61000);
  expect(
    commandTimer(draft, { ...complete, exercise_id: trainingId(99) }, 1000),
  ).toBeNull();
  const ticking = { ...draft, timer };
  expect(commandTimer(ticking, { type: "rename_workout", name: "X" }, 0)).toBe(
    timer,
  );
  expect(
    commandTimer(
      ticking,
      { type: "remove_exercise", exercise_id: trainingId(99) },
      0,
    ),
  ).toBe(timer);
  expect(
    commandTimer(
      ticking,
      { type: "remove_exercise", exercise_id: exercise.id },
      0,
    ),
  ).toBeNull();
  expect(
    commandTimer(ticking, { ...complete, completed: false }, 0),
  ).toBeNull();
  expect(
    commandTimer(
      ticking,
      { type: "upsert_set", exercise_id: exercise.id, set },
      0,
    ),
  ).toBeNull();
  expect(
    commandTimer(
      ticking,
      { type: "remove_set", exercise_id: exercise.id, set_id: set.id },
      0,
    ),
  ).toBeNull();
  expect(
    commandTimer(
      ticking,
      { type: "remove_set", exercise_id: trainingId(99), set_id: set.id },
      0,
    ),
  ).toBe(timer);
  expect(
    commandTimer(
      ticking,
      { type: "remove_set", exercise_id: exercise.id, set_id: trainingId(99) },
      0,
    ),
  ).toBe(timer);
});
it("rejects foreign-workout queues, repeated operation IDs and unbounded raw data", () => {
  const item = {
    kind: "cancel",
    operation_id: trainingId(7),
    session_id: session.id,
    expected_revision: 0,
  };
  expect(
    draftSchema.safeParse({ ...emptyDraft(), pending: [item] }).success,
  ).toBe(false);
  expect(
    draftSchema.safeParse({ ...emptyDraft(), session, pending: [item, item] })
      .success,
  ).toBe(false);
  expect(
    draftSchema.safeParse({
      ...emptyDraft(),
      raw: Object.fromEntries(
        Array.from({ length: 10001 }, (_, i) => [String(i), ""]),
      ),
    }).success,
  ).toBe(false);
  expect(
    draftSchema.safeParse({ ...emptyDraft(), session, pending: [item] })
      .success,
  ).toBe(true);
});
it("clears only acknowledged workout text drafts and keeps unrelated rows", () => {
  const raw = {
    "workout:w:name": "New",
    [`${exercise.id}:notes`]: "Slow",
    [`${exercise.id}:rest`]: "90",
    other: "72.",
  };
  expect(clearCommandRaw(raw, { type: "rename_workout", name: "New" })).toEqual(
    {
      [`${exercise.id}:notes`]: "Slow",
      [`${exercise.id}:rest`]: "90",
      other: "72.",
    },
  );
  expect(
    clearCommandRaw(raw, {
      type: "update_exercise",
      exercise_id: exercise.id,
      notes: "Slow",
      rest_seconds: 90,
    }),
  ).toEqual({ "workout:w:name": "New", other: "72." });
});
it("finishes measured sets only when their required values are present", () => {
  const measured = {
    ...makeSet(),
    entered_load: null,
    reps: null,
    duration_seconds: 120,
    entered_distance: "1.5",
    distance_unit: "km" as const,
    completed_at: "2026-10-27T00:00:00Z",
  };
  const timed = {
    ...exercise,
    tracking_type: "distance_duration" as const,
    sets: [measured],
  };
  expect(canFinish({ ...session, exercises: [timed] })).toBe(true);
  expect(
    canFinish({
      ...session,
      exercises: [
        { ...timed, sets: [{ ...measured, entered_distance: null }] },
      ],
    }),
  ).toBe(false);
  expect(rawFieldKey(exercise.id, makeSet().id, "duration")).toContain(
    ":duration",
  );
});
