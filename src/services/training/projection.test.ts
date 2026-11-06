import {
  makeCatalogExercise,
  makeSession,
  makeSet,
  trainingId,
} from "../../../tests/fixtures/training";
import { projectCommand, projectPending } from "./projection";
import type { TrainingSession, WorkoutCommand } from "@/domain/training";
const now = 1000;
const add: WorkoutCommand = {
  type: "add_exercise",
  id: trainingId(9),
  exercise_id: trainingId(2),
  position: 0,
  load_mode: "external",
  notes: "",
  rest_seconds: 60,
};
const exercise = trainingId(9);
function populated(): TrainingSession {
  const session = projectCommand(
    makeSession(),
    { command: add, catalog: makeCatalogExercise() },
    now,
  );
  return projectCommand(
    session,
    { command: { type: "upsert_set", exercise_id: exercise, set: makeSet() } },
    now,
  );
}
const run = (session: TrainingSession, command: WorkoutCommand) =>
  projectCommand(session, { command }, now);
it("rejects unconfigured exercises before projecting a workout", () => {
  expect(() => projectCommand(makeSession(), {
    command: add,
    catalog: { ...makeCatalogExercise(), origin: "provider", is_configured: false, load_mode: null, load_convention: null, tracking_type: null },
  }, now)).toThrow();
});
it("projects all exercise operations immutably, with stable IDs and complete permutations", () => {
  const original = makeSession();
  const session = populated();
  expect(original.exercises).toEqual([]);
  expect(session.exercises[0]?.name).toBe("Bench press");
  expect(run(session, add)).toBe(session);
  const second = run(session, { ...add, id: trainingId(10), position: 1 });
  expect(second.exercises[1]?.name).toBe("Exercise");
  expect(second.exercises[1]?.load_convention).toBe("Unspecified");
  expect(
    run(second, { type: "reorder_exercises", ids: [trainingId(10), exercise] })
      .exercises[0]?.id,
  ).toBe(trainingId(10));
  expect(
    run(second, { type: "remove_exercise", exercise_id: exercise }).exercises[0]
      ?.position,
  ).toBe(0);
  expect(run(session, { type: "rename_workout", name: "Push" }).name).toBe(
    "Push",
  );
  expect(
    run(second, {
      type: "update_exercise",
      exercise_id: exercise,
      notes: "Slow",
      rest_seconds: 30,
    }).exercises[0]?.notes,
  ).toBe("Slow");
  for (const ids of [[], [exercise, exercise], [exercise, trainingId(44)]])
    expect(() => run(second, { type: "reorder_exercises", ids })).toThrow();
  expect(() =>
    run(session, {
      type: "update_exercise",
      exercise_id: trainingId(88),
      notes: "",
      rest_seconds: 0,
    }),
  ).toThrow();
});
it("preserves unchanged completion, resets changed sets, and supports ordering/removal", () => {
  const session = populated();
  const set = makeSet();
  const completed = run(session, {
    type: "complete_set",
    exercise_id: exercise,
    set_id: set.id,
    completed: true,
  });
  expect(completed.exercises[0]?.sets[0]?.completed_at).toBe(
    new Date(now).toISOString(),
  );
  expect(
    run(completed, { type: "upsert_set", exercise_id: exercise, set })
      .exercises[0]?.sets[0]?.completed_at,
  ).not.toBeNull();
  for (const change of [
    { entered_load: "61" },
    { entered_unit: "lb" as const },
    { reps: 9 },
    { set_type: "warmup" as const },
  ])
    expect(
      run(completed, {
        type: "upsert_set",
        exercise_id: exercise,
        set: { ...set, ...change },
      }).exercises[0]?.sets[0]?.completed_at,
    ).toBeNull();
  expect(
    run(completed, {
      type: "complete_set",
      exercise_id: exercise,
      set_id: set.id,
      completed: false,
    }).exercises[0]?.sets[0]?.completed_at,
  ).toBeNull();
  const second = run(session, {
    type: "upsert_set",
    exercise_id: exercise,
    set: { ...set, id: trainingId(11), position: 1 },
  });
  expect(
    run(second, {
      type: "reorder_sets",
      exercise_id: exercise,
      ids: [trainingId(11), set.id],
    }).exercises[0]?.sets[0]?.id,
  ).toBe(trainingId(11));
  expect(
    run(second, { type: "remove_set", exercise_id: exercise, set_id: set.id })
      .exercises[0]?.sets[0]?.position,
  ).toBe(0);
  expect(() =>
    run(session, {
      type: "complete_set",
      exercise_id: exercise,
      set_id: trainingId(99),
      completed: true,
    }),
  ).toThrow();
  expect(projectPending(null, [], now)).toBeNull();
  expect(
    projectPending(
      session,
      [{ command: { type: "rename_workout", name: "Pending" } }],
      now,
    )?.name,
  ).toBe("Pending");
});
it("preserves each exact set type and clears completion when its type changes", () => {
  const setTypes = ["warmup", "working", "drop", "failure", "rest_pause"] as const;
  for (const set_type of setTypes) {
    const set = { ...makeSet(), set_type };
    const withSet = run(populated(), {
      type: "upsert_set",
      exercise_id: exercise,
      set,
    });
    expect(withSet.exercises[0]?.sets[0]?.set_type).toBe(set_type);
    const completed = run(withSet, {
      type: "complete_set",
      exercise_id: exercise,
      set_id: set.id,
      completed: true,
    });
    expect(completed.exercises[0]?.sets[0]?.completed_at).not.toBeNull();
    const nextType = setTypes.find((candidate) => candidate !== set_type) ?? "warmup";
    const changed = run(completed, {
      type: "upsert_set",
      exercise_id: exercise,
      set: { ...set, set_type: nextType },
    });
    expect(changed.exercises[0]?.sets[0]?.set_type).toBe(nextType);
    expect(changed.exercises[0]?.sets[0]?.completed_at).toBeNull();
  }
});
it("preserves the tracking type and clears completion after measurement edits", () => {
  const timed = projectCommand(
    makeSession(),
    { command: { ...add, tracking_type: "distance_duration" } },
    now,
  );
  expect(timed.exercises[0]?.tracking_type).toBe("distance_duration");
  const values = {
    ...makeSet(),
    entered_load: null,
    reps: null,
    duration_seconds: 120,
    entered_distance: "1.0",
    distance_unit: "km" as const,
  };
  const withSet = run(timed, {
    type: "upsert_set",
    exercise_id: exercise,
    set: values,
  });
  const completed = run(withSet, {
    type: "complete_set",
    exercise_id: exercise,
    set_id: values.id,
    completed: true,
  });
  expect(
    run(completed, { type: "upsert_set", exercise_id: exercise, set: values })
      .exercises[0]?.sets[0]?.completed_at,
  ).not.toBeNull();
  for (const change of [
    { duration_seconds: 121 },
    { entered_distance: "2" },
    { distance_unit: "mi" as const },
  ]) {
    expect(
      run(completed, {
        type: "upsert_set",
        exercise_id: exercise,
        set: { ...values, ...change },
      }).exercises[0]?.sets[0]?.completed_at,
    ).toBeNull();
  }
});
