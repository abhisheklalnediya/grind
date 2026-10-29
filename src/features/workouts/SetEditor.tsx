import { useEffect, useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
import { SetOptions } from "./SetOptions";
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
import { styles } from "./setEditorStyles";
import { editedSet } from "./fields";
type Exercise = TrainingSession["exercises"][number];
export function SetEditor({
  exercise,
  set,
  previous = "—",
}: {
  exercise: Exercise;
  set: TrainingSet;
  previous?: string;
}) {
  const training = useTraining();
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState(false);
  const repsInput = useRef<TextInput>(null);
  const [focused, setFocused] = useState<"load" | "reps" | null>(null);
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
  const context = `${exercise.name} set ${index + 1}`;
  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.loggingRow}>
        <View style={styles.setColumn}>
          <Text style={{ color: colors.secondary }}>Set</Text>
          <Text
            accessibilityLabel={`Set ${index + 1} · ${set.set_type}`}
            style={{ color: colors.text, fontSize: 20 }}
          >
            {set.set_type === "warmup"
              ? "W"
              : exercise.sets
                  .slice(0, index + 1)
                  .filter((row) => row.set_type === "working").length}
          </Text>
        </View>
        <View style={styles.previousColumn}>
          <Text style={{ color: colors.secondary }}>Previous: {previous}</Text>
        </View>
        {exercise.load_mode !== "bodyweight" && (
          <View style={styles.inputColumn}>
            <Text style={{ color: colors.secondary }}>
              {loadFieldLabel(exercise.load_mode, set.entered_unit)}
            </Text>
            <TextInput
              accessibilityLabel={`${exercise.name} set ${index + 1} ${loadFieldLabel(exercise.load_mode, set.entered_unit)}`}
              style={inputStyle}
              value={load}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onFocus={() => setFocused("load")}
              onSubmitEditing={() => repsInput.current?.focus()}
              onChangeText={(value) => update("load", value)}
              onBlur={() => {
                setFocused((current) => (current === "load" ? null : current));
                void save();
              }}
            />
          </View>
        )}
        <View style={styles.inputColumn}>
          <Text style={{ color: colors.secondary }}>Reps</Text>
          <TextInput
            ref={repsInput}
            accessibilityLabel={`${exercise.name} set ${index + 1} reps`}
            style={inputStyle}
            value={reps}
            keyboardType="number-pad"
            returnKeyType="done"
            onFocus={() => setFocused("reps")}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              setFocused(null);
              void save();
            }}
            onChangeText={(value) => update("reps", value)}
            onBlur={() => {
              setFocused((current) => (current === "reps" ? null : current));
              void save();
            }}
          />
        </View>
        <View style={styles.completeColumn}>
          <Button
            label={set.completed_at ? "Undo" : "Done"}
            accessibilityLabel={`${context}: ${set.completed_at ? "Mark incomplete" : "Complete set"}`}
            onPress={() => {
              void save(true);
            }}
          />
        </View>
      </View>
      {focused && (
        <View style={styles.tools}>
          {focused === "load" && (
            <Button
              secondary
              label="Next: reps"
              accessibilityLabel={`${context}: Next, reps`}
              onPress={() => repsInput.current?.focus()}
            />
          )}
          <Button
            secondary
            label="Done editing set"
            accessibilityLabel={`${context}: Done editing set`}
            onPress={() => {
              Keyboard.dismiss();
              setFocused(null);
              void save();
            }}
          />
        </View>
      )}
      <Button
        secondary
        label={options ? "Hide set options" : "Set options"}
        accessibilityLabel={`${context}: ${options ? "Hide set options" : "Set options"}`}
        onPress={() => setOptions(!options)}
      />
      {options && (
        <SetOptions
          exercise={exercise}
          set={set}
          load={load}
          latest={() => latest.current}
          send={send}
        />
      )}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
