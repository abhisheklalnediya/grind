import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { LoadUnitControl } from "@/components/LoadUnitControl";
import { Button } from "@/components/Button";
import {
  isSetCompleteable,
  loadFieldLabel,
  type TrainingSession,
  type TrainingSet,
} from "@/domain/training";
import { useTraining } from "@/features/training";
import { rawFieldKey } from "@/services/training/outboxState";
import { useTheme } from "@/theme/useTheme";
import { editedSet, moved } from "./fields";
type Exercise = TrainingSession["exercises"][number];
export function SetEditor({
  exercise,
  set,
}: {
  exercise: Exercise;
  set: TrainingSet;
}) {
  const training = useTraining();
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const send = (command: Parameters<typeof training.command>[0]) =>
    training
      .command(command)
      .catch(() => setMessage("Change is pending. Use Retry above."));
  const loadKey = rawFieldKey(exercise.id, set.id, "load");
  const repsKey = rawFieldKey(exercise.id, set.id, "reps");
  const load = training.raw[loadKey] ?? set.entered_load ?? "";
  const reps = training.raw[repsKey] ?? String(set.reps ?? "");
  const latest = useRef({ load, reps });
  const writes = useRef(0);
  useEffect(() => {
    if (writes.current === 0) latest.current = { load, reps };
  }, [load, reps]);
  const update = (field: "load" | "reps", value: string) => {
    latest.current[field] = value;
    writes.current += 1;
    void training
      .setRaw(field === "load" ? loadKey : repsKey, value)
      .catch(() => setMessage("Could not preserve input. Retry."))
      .finally(() => {
        writes.current -= 1;
      });
  };
  const save = async (complete = false) => {
    const input = editedSet(
      set,
      exercise.load_mode,
      latest.current.load,
      latest.current.reps,
    );
    if (!input || (complete && !isSetCompleteable(input, exercise.load_mode))) {
      setMessage("Enter a complete valid load and reps.");
      return;
    }
    try {
      if (
        input.entered_load !== set.entered_load ||
        input.reps !== set.reps ||
        training.raw[loadKey] !== undefined ||
        training.raw[repsKey] !== undefined
      )
        await training.command({
          type: "upsert_set",
          exercise_id: exercise.id,
          set: input,
        });
      if (complete)
        await training.command({
          type: "complete_set",
          exercise_id: exercise.id,
          set_id: set.id,
          completed: !set.completed_at,
        });
      setMessage("");
    } catch {
      setMessage("Change is pending. Use Retry above.");
    }
  };
  const index = exercise.sets.findIndex((item) => item.id === set.id);
  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={{ color: colors.text }}>
        Set {index + 1} · {set.set_type}
      </Text>
      {exercise.load_mode !== "bodyweight" && (
        <TextInput
          accessibilityLabel={`${exercise.name} set ${index + 1} ${loadFieldLabel(exercise.load_mode, set.entered_unit)}`}
          style={inputStyle}
          value={load}
          keyboardType="decimal-pad"
          onChangeText={(value) => update("load", value)}
          onBlur={() => {
            void save();
          }}
        />
      )}
      <TextInput
        accessibilityLabel={`${exercise.name} set ${index + 1} reps`}
        style={inputStyle}
        value={reps}
        keyboardType="number-pad"
        onChangeText={(value) => update("reps", value)}
        onBlur={() => {
          void save();
        }}
      />
      <Button
        label={set.completed_at ? "Mark incomplete" : "Complete set"}
        onPress={() => {
          void save(true);
        }}
      />
      <Button
        secondary
        label={set.set_type === "working" ? "Make warm-up" : "Make working"}
        onPress={() => {
          const input = editedSet(
            set,
            exercise.load_mode,
            latest.current.load,
            latest.current.reps,
          );
          if (input)
            void send({
              type: "upsert_set",
              exercise_id: exercise.id,
              set: {
                ...input,
                set_type: set.set_type === "working" ? "warmup" : "working",
              },
            });
        }}
      />
      {exercise.load_mode !== "bodyweight" && (
        <LoadUnitControl
          load={load}
          unit={set.entered_unit}
          onChangeUnit={(unit) => {
            const input = editedSet(
              set,
              exercise.load_mode,
              latest.current.load,
              latest.current.reps,
            );
            if (input)
              void send({
                type: "upsert_set",
                exercise_id: exercise.id,
                set: { ...input, entered_unit: unit },
              });
          }}
        />
      )}
      <Button
        secondary
        disabled={index === 0}
        label="Move set up"
        onPress={() => {
          void send({
            type: "reorder_sets",
            exercise_id: exercise.id,
            ids: moved(
              exercise.sets.map((item) => item.id),
              index,
              -1,
            ),
          });
        }}
      />
      <Button
        secondary
        label="Remove set"
        onPress={() => {
          void send({
            type: "remove_set",
            exercise_id: exercise.id,
            set_id: set.id,
          });
        }}
      />
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 12 },
  input: {
    minHeight: 48,
    fontSize: 20,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
});
