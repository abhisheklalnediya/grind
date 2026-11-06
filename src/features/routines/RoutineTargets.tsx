import { setTypeLabels, type TrainingRoutine } from "@/domain/training";
import { Copy } from "@/features/exercises/shared";
import { Panel } from "@/components/Panel";
import { Text } from "react-native";
import { useTheme } from "@/theme/useTheme";

type RoutineExercise = TrainingRoutine["exercises"][number];

export function RoutineTargets({
  exercise,
  name,
  position,
}: {
  exercise: RoutineExercise;
  name: string;
  position: number;
}) {
  const { colors } = useTheme();
  return (
    <Panel>
      <Text style={{ color: colors.accentText, fontWeight: "800" }}>
        {String(position + 1).padStart(2, "0")}
      </Text>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}
      >
        {name}
      </Text>
      <Copy>
        {exercise.sets.length} {exercise.sets.length === 1 ? "set" : "sets"} ·{" "}
        {exercise.rest_seconds}s rest
        {exercise.notes ? ` · ${exercise.notes}` : ""}
      </Copy>
      {exercise.sets.map((set, index) => (
        <Copy key={set.id}>
          {setTypeLabels[set.set_type]} {setNumber(exercise, index)} ·{" "}
          {target(exercise, set)}
        </Copy>
      ))}
    </Panel>
  );
}

function setNumber(exercise: RoutineExercise, index: number) {
  const set = exercise.sets[index];
  return set
    ? exercise.sets
        .slice(0, index + 1)
        .filter((item) => item.set_type === set.set_type).length
    : index + 1;
}

function target(
  exercise: RoutineExercise,
  set: RoutineExercise["sets"][number],
) {
  if (
    exercise.tracking_type === "duration" ||
    exercise.tracking_type === "distance_duration"
  ) {
    const duration =
      set.duration_seconds == null
        ? "Duration unspecified"
        : `${set.duration_seconds} sec`;
    if (exercise.tracking_type === "duration") return duration;
    const distance =
      set.entered_distance == null
        ? "Distance unspecified"
        : `${set.entered_distance} ${set.distance_unit ?? ""}`.trim();
    return `${duration} · ${distance}`;
  }
  const mode = exercise.load_mode;
  const load =
    mode === "bodyweight"
      ? "Bodyweight"
      : set.entered_load == null
        ? `${mode === "assisted" ? "Assistance" : mode === "weighted_bodyweight" ? "Added weight" : "Weight"} unspecified`
        : `${mode === "assisted" ? "Assistance" : mode === "weighted_bodyweight" ? "Added weight" : "Weight"} ${set.entered_load} ${set.entered_unit}`;
  const reps = set.reps == null ? "reps unspecified" : `${set.reps} reps`;
  return `${load} · ${reps}`;
}
