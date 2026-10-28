import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
    ],
    queryFn: () =>
      training.api?.previous(
        exercise.exercise_id,
        exercise.load_mode,
        exercise.load_convention,
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
  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 24 }}
      >
        {exercise.name}
      </Text>
      <Text style={{ color: colors.secondary }}>
        {loadFieldLabel(exercise.load_mode, defaults.unit)} ·{" "}
        {exercise.load_convention}
      </Text>
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
      <TextInput
        accessibilityLabel={`${exercise.name} rest seconds`}
        value={rest.value}
        keyboardType="number-pad"
        onChangeText={rest.change}
        onBlur={saveDetails}
        style={{ minHeight: 48, color: colors.text }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      {previous.isError ? (
        <Button
          secondary
          label="Retry previous"
          onPress={() => {
            void previous.refetch();
          }}
        />
      ) : null}
      {exercise.sets.map((set, index) => {
        const earlier =
          training.session?.exercises
            .slice(0, position)
            .filter(
              (item) =>
                item.exercise_id === exercise.exercise_id &&
                item.load_mode === exercise.load_mode &&
                item.load_convention === exercise.load_convention,
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
        return (
          <View key={set.id} style={styles.row}>
            <Text style={{ color: colors.secondary }}>
              Previous:{" "}
              {prior
                ? `${prior.entered_load ?? "Bodyweight"} ${prior.entered_load === null ? "" : prior.entered_unit} × ${prior.reps}`
                : previous.isPending
                  ? "Loading…"
                  : "—"}
            </Text>
            <SetEditor exercise={exercise} set={set} />
          </View>
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
          void send({
            type: "remove_exercise",
            exercise_id: exercise.id,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ group: { gap: 12 }, row: { gap: 8 } });
