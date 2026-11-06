import { StyleSheet, Text, View } from "react-native";
import { setTypeLabels, toCanonicalKg, type TrainingSession } from "@/domain/training";
import { useTheme } from "@/theme/useTheme";
export function SessionDetails({ session }: { session: TrainingSession }) {
  const { colors } = useTheme();
  const completed = session.exercises.flatMap((exercise) =>
    exercise.sets
      .filter((set) => set.completed_at && set.set_type === "working")
      .map((set) => ({ exercise, set })),
  );
  const volume = completed.reduce(
    (sum, { exercise, set }) =>
      sum +
      ((exercise.tracking_type ?? "reps") === "reps" &&
      (exercise.load_mode === "external" ||
        exercise.load_mode === "weighted_bodyweight") &&
      set.entered_load !== null
        ? Number(toCanonicalKg(set.entered_load, set.entered_unit)) *
          (set.reps ?? 0)
        : 0),
    0,
  );
  const minutes = session.finished_at
    ? Math.max(
        0,
        Math.round(
          (Date.parse(session.finished_at) - Date.parse(session.started_at)) /
            60000,
        ),
      )
    : 0;
  return (
    <View style={styles.group}>
      <Text style={{ color: colors.text }}>
        {completed.length} working sets · {minutes} minutes
      </Text>
      <Text style={{ color: colors.secondary }}>
        {Number(volume.toFixed(3))} kg eligible volume (external and added load)
      </Text>
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 20 }}>
            {exercise.name} ·{" "}
            {exercise.tracking_type === "duration"
              ? "Duration"
              : exercise.tracking_type === "distance_duration"
                ? "Duration and distance"
                : exercise.load_mode}
          </Text>
          <Text style={{ color: colors.secondary }}>
            {exercise.load_convention}
            {exercise.notes ? ` · ${exercise.notes}` : ""}
          </Text>
          {exercise.sets.map((set, index) => (
            <Text key={set.id} style={{ color: colors.text }}>
              {setTypeLabels[set.set_type]} {setOrdinal(exercise.sets, index)}:{" "}
              {exercise.tracking_type && exercise.tracking_type !== "reps" ? (
                <>
                  {set.duration_seconds ?? "—"} seconds
                  {exercise.tracking_type === "distance_duration"
                    ? ` · ${set.entered_distance ?? "—"} ${set.distance_unit ?? ""}`
                    : ""}
                </>
              ) : (
                <>
                  {set.entered_load === null
                    ? "Bodyweight"
                    : `${set.entered_load} ${set.entered_unit}`}{" "}
                  × {set.reps ?? "—"}
                </>
              )}
              {set.completed_at ? " ✓" : ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function setOrdinal(
  sets: TrainingSession["exercises"][number]["sets"],
  index: number,
) {
  const current = sets[index];
  if (!current) return index + 1;
  return sets
    .slice(0, index + 1)
    .filter((set) => set.set_type === current.set_type).length;
}

const styles = StyleSheet.create({ group: { gap: 12 }, row: { gap: 8 } });
