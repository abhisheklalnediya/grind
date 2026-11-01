import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { Button } from "@/components/Button";
import {
  type TrainingSession,
  loadFieldLabel,
  previousForSet,
} from "@/domain/training";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { useTrainingDefaults } from "@/features/preferences";
import { SetEditor } from "./SetEditor";
import { TimedSetEditor } from "./TimedSetEditor";
import { useWorkoutDraft } from "./useWorkoutDraft";
import { moved } from "./fields";
export function ExerciseEditor({
  exercise,
}: {
  exercise: TrainingSession["exercises"][number];
}) {
  const training = useTraining();
  const defaults = useTrainingDefaults();
  const { colors, scope } = useTheme();
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const notes = useWorkoutDraft(
    `${exercise.id}:notes`,
    exercise.notes,
    setError,
  );
  const rest = useWorkoutDraft(
    `${exercise.id}:rest`,
    String(exercise.rest_seconds),
    setError,
  );
  const send = (command: Parameters<typeof training.command>[0]) =>
    training
      .command(command)
      .catch(() => setError("Change is pending. Use Retry above."));
  const previous = useQuery({
    queryKey: [
      "previous",
      scope,
      exercise.exercise_id,
      exercise.load_mode,
      exercise.load_convention,
      exercise.tracking_type ?? "reps",
    ],
    queryFn: () =>
      training.api?.previous(
        exercise.exercise_id,
        exercise.load_mode,
        exercise.load_convention,
        exercise.tracking_type,
      ) ?? Promise.resolve(null),
    enabled: !!training.api,
  });
  const saveDetails = () => {
    if (
      !/^\d+$/.test(rest.latest.current) ||
      Number(rest.latest.current) < 15 ||
      Number(rest.latest.current) > 3600
    ) {
      setError("Rest must be 15–3600 seconds.");
      return;
    }
    setError("");
    void send({
      type: "update_exercise",
      exercise_id: exercise.id,
      notes: notes.latest.current,
      rest_seconds: Number(rest.latest.current),
    });
  };
  const position =
    training.session?.exercises.findIndex((item) => item.id === exercise.id) ??
    0;
  const enteredUnits = new Set(exercise.sets.map((set) => set.entered_unit));
  const loadHeading =
    enteredUnits.size === 1
      ? ([...enteredUnits][0]?.toUpperCase() ?? defaults.unit.toUpperCase())
      : "LOAD";
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.exerciseHead}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {exercise.name}
        </Text>
        <Button
          secondary
          label="•••"
          selected={detailsOpen}
          accessibilityLabel={`Options for ${exercise.name}`}
          onPress={() => setDetailsOpen(!detailsOpen)}
        />
      </View>
      <Text style={{ color: colors.secondary, fontSize: 12 }}>
        {exercise.tracking_type === "duration"
          ? "Duration"
          : exercise.tracking_type === "distance_duration"
            ? "Duration and distance"
            : `${loadFieldLabel(exercise.load_mode, defaults.unit)} · ${exercise.load_convention}`}
        {` · Rest ${Math.floor(exercise.rest_seconds / 60)}:${String(exercise.rest_seconds % 60).padStart(2, "0")}`}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      {detailsOpen && (
        <>
          <Text style={{ color: colors.secondary }}>Exercise notes</Text>
          <TextInput
            accessibilityLabel={`${exercise.name} notes`}
            value={notes.value}
            maxLength={2000}
            multiline
            onChangeText={notes.change}
            onBlur={saveDetails}
            style={{
              minHeight: 48,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          />
          <Text style={{ color: colors.secondary }}>
            Rest duration (seconds)
          </Text>
          <TextInput
            accessibilityLabel={`${exercise.name} rest seconds`}
            value={rest.value}
            keyboardType="number-pad"
            onChangeText={rest.change}
            onBlur={saveDetails}
            style={{ minHeight: 48, color: colors.text }}
          />
        </>
      )}
      {previous.isError ? (
        <Button
          secondary
          label="Retry previous"
          onPress={() => {
            void previous.refetch();
          }}
        />
      ) : null}
      <View style={styles.tableHeader} accessibilityRole="summary">
        <Text style={[styles.headerSet, { color: colors.secondary }]}>SET</Text>
        <Text style={[styles.headerPrevious, { color: colors.secondary }]}>
          PREVIOUS
        </Text>
        {exercise.tracking_type && exercise.tracking_type !== "reps" ? (
          <>
            <Text style={[styles.headerMetric, { color: colors.secondary }]}>
              DURATION
            </Text>
            {exercise.tracking_type === "distance_duration" ? (
              <Text style={[styles.headerMetric, { color: colors.secondary }]}>
                DISTANCE
              </Text>
            ) : null}
          </>
        ) : (
          <>
            {exercise.load_mode !== "bodyweight" ? (
              <Text style={[styles.headerMetric, { color: colors.secondary }]}>
                {loadHeading}
              </Text>
            ) : null}
            <Text style={[styles.headerMetric, { color: colors.secondary }]}>
              REPS
            </Text>
          </>
        )}
        <Text
          style={[
            styles.headerDone,
            exercise.tracking_type && exercise.tracking_type !== "reps"
              ? styles.headerTimedDone
              : null,
            { color: colors.secondary },
          ]}
        >
          DONE
        </Text>
      </View>
      {exercise.sets.map((set, index) => {
        const earlier =
          training.session?.exercises
            .slice(0, position)
            .filter(
              (item) =>
                item.exercise_id === exercise.exercise_id &&
                item.load_mode === exercise.load_mode &&
                item.load_convention === exercise.load_convention &&
                (item.tracking_type ?? "reps") ===
                  (exercise.tracking_type ?? "reps"),
            )
            .flatMap((item) => item.sets)
            .filter((item) => item.set_type === set.set_type).length ?? 0;
        const ordinal =
          earlier +
          exercise.sets
            .slice(0, index)
            .filter((row) => row.set_type === set.set_type).length;
        const prior = previousForSet(
          previous.data ?? null,
          set.set_type,
          ordinal,
        );
        if (exercise.tracking_type && exercise.tracking_type !== "reps")
          return (
            <TimedSetEditor
              key={set.id}
              exercise={exercise}
              set={set}
              previous={
                prior
                  ? `${prior.duration_seconds ?? "—"} seconds${exercise.tracking_type === "distance_duration" ? ` · ${prior.entered_distance ?? "—"} ${prior.distance_unit ?? ""}` : ""}`
                  : previous.isPending
                    ? "Loading…"
                    : "—"
              }
            />
          );
        return (
          <SetEditor
            key={set.id}
            exercise={exercise}
            set={set}
            previous={
              prior
                ? `${prior.entered_load ?? "Bodyweight"} ${prior.entered_load === null ? "" : prior.entered_unit} × ${prior.reps}`
                : previous.isPending
                  ? "Loading…"
                  : "—"
            }
          />
        );
      })}
      {defaults.error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            {defaults.error}
          </Text>
          <Button label="Retry defaults" onPress={defaults.retry} />
        </>
      ) : null}
      <Button
        secondary
        label="Add set"
        disabled={
          exercise.sets.length >= 100 ||
          defaults.pending ||
          Boolean(defaults.error)
        }
        onPress={() => {
          void send({
            type: "upsert_set",
            exercise_id: exercise.id,
            set: {
              id: randomUUID(),
              position: exercise.sets.length,
              set_type: "working",
              entered_load: null,
              entered_unit: defaults.unit,
              reps: null,
            },
          });
        }}
      />
      {detailsOpen && (
        <>
          <Button
            secondary
            label="Move exercise up"
            disabled={position === 0}
            onPress={() => {
              void send({
                type: "reorder_exercises",
                ids: moved(
                  training.session?.exercises.map((item) => item.id) ?? [],
                  position,
                  -1,
                ),
              });
            }}
          />
          <Button
            secondary
            label="Remove exercise"
            onPress={() => {
              const hasLocalInput = Object.keys(training.raw).some((key) =>
                key.startsWith(`${exercise.id}:`),
              );
              const populated =
                hasLocalInput ||
                exercise.notes.trim().length > 0 ||
                exercise.rest_seconds !== 120 ||
                exercise.sets.some(
                  (set) =>
                    Boolean(set.completed_at) ||
                    (set.entered_load ?? null) !== null ||
                    (set.reps ?? null) !== null ||
                    (set.duration_seconds ?? null) !== null ||
                    (set.entered_distance ?? null) !== null,
                );
              const remove = () =>
                void send({
                  type: "remove_exercise",
                  exercise_id: exercise.id,
                });
              if (!populated) return remove();
              Alert.alert(
                "Remove exercise and entered work?",
                "Its sets, completed status, entered values, notes, and rest setting will be removed from this active workout.",
                [
                  { text: "Keep exercise", style: "cancel" },
                  {
                    text: "Remove exercise",
                    style: "destructive",
                    onPress: remove,
                  },
                ],
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 16 },
  exerciseHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
    paddingHorizontal: 2,
  },
  headerSet: {
    width: 32,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  headerPrevious: {
    flex: 1.2,
    minWidth: 42,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  headerMetric: {
    flex: 1,
    minWidth: 42,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  headerDone: {
    width: 102,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  headerTimedDone: { width: 52 },
});
