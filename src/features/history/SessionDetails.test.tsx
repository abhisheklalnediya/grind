import { render, screen } from "@testing-library/react-native";
import type { TrainingSession } from "@/domain/training";
import { trainingId, makeSession } from "../../../tests/fixtures/training";
import { SessionDetails } from "./SessionDetails";

it("labels all set types with per-type ordinals while counting only working sets", async () => {
  const session = {
    ...makeSession(),
    status: "completed",
    exercises: [
      {
        id: trainingId(60),
        exercise_id: trainingId(2),
        position: 0,
        name: "Bench press",
        load_mode: "external",
        load_convention: "Total barbell weight",
        notes: "",
        rest_seconds: 120,
        sets: (["warmup", "working", "drop", "failure", "rest_pause", "working"] as const).map(
          (set_type, position) => ({
            id: trainingId(70 + position),
            position,
            set_type,
            entered_load: "20",
            entered_unit: "kg" as const,
            reps: 5,
            completed_at: "2026-10-27T12:01:00.000Z",
          }),
        ),
      },
    ],
  } as TrainingSession;

  await render(<SessionDetails session={session} />);

  expect(screen.getByText("2 working sets · 0 minutes")).toBeTruthy();
  expect(screen.getByText("Warm-up 1: 20 kg × 5 ✓")).toBeTruthy();
  expect(screen.getByText("Working 1: 20 kg × 5 ✓")).toBeTruthy();
  expect(screen.getByText("Drop 1: 20 kg × 5 ✓")).toBeTruthy();
  expect(screen.getByText("Failure 1: 20 kg × 5 ✓")).toBeTruthy();
  expect(screen.getByText("Rest-pause 1: 20 kg × 5 ✓")).toBeTruthy();
  expect(screen.getByText("Working 2: 20 kg × 5 ✓")).toBeTruthy();
});
