import { useEffect, useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
import { SetOptions } from "./SetOptions";
import { SetTypeSelector } from "@/components/SetTypeSelector";
import { Button } from "@/components/Button";
import {
  isSetCompleteable,
  setTypeLabels,
  setTypeShortLabel,
  setTypeSchema,
  type SetType,
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
  showUnit = false,
  supportedTypes = ["warmup", "working"],
}: {
  exercise: Exercise;
  set: TrainingSet;
  previous?: string;
  showUnit?: boolean;
  supportedTypes?: SetType[];
}) {
  const training = useTraining();
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState(false);
  const repsInput = useRef<TextInput>(null);
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
    if (complete && set.completed_at) {
      try {
        await training.command({
          type: "complete_set",
          exercise_id: exercise.id,
          set_id: set.id,
          completed: false,
        });
        setMessage("");
      } catch {
        setMessage("Change is pending. Use Retry above.");
      }
      return;
    }
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
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: set.completed_at
        ? colors.disabledSurface
        : colors.background,
    },
  ];
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: set.completed_at ? colors.surface : "transparent",
        },
      ]}
    >
      <View style={styles.loggingRow}>
        <SetTypeSelector
          context={context}
          completed={Boolean(set.completed_at)}
          value={set.set_type}
          currentOption={{
            value: set.set_type,
            label: `${setTypeLabels[set.set_type]} set`,
            shortLabel: setTypeShortLabel(set.set_type, 0),
          }}
          options={Array.from(
            new Set([
              ...supportedTypes.filter((type) => type !== "rest_pause"),
              ...(set.set_type === "rest_pause" ? [] : [set.set_type]),
            ]),
          ).map((type) => ({
            value: type,
            label: `${setTypeLabels[type]} set`,
            shortLabel: setTypeShortLabel(
              type,
              exercise.sets
                .slice(0, index + 1)
                .filter((row) => row.set_type === "working").length,
            ),
          }))}
          onSelect={(value) => {
            const type = setTypeSchema.safeParse(value);
            if (!type.success || type.data === set.set_type) return;
            const input = editedSet(
              set,
              exercise.load_mode,
              latest.current.load,
              latest.current.reps,
            );
            if (!input) {
              setMessage("Fix the entered values before changing set type.");
              return;
            }
            void send({
              type: "upsert_set",
              exercise_id: exercise.id,
              set: { ...input, set_type: type.data },
            });
          }}
          onMore={() => setOptions(!options)}
          moreLabel={options ? "Hide set actions" : "More set actions"}
        />
        <View style={styles.previousColumn}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.secondary,
              textAlign: "center",
              fontSize: 11,
            }}
          >
            {previous}
          </Text>
        </View>
        {exercise.load_mode !== "bodyweight" && (
          <View style={styles.inputColumn}>
            {showUnit ? (
              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 10,
                  textAlign: "center",
                }}
              >
                {set.entered_unit}
              </Text>
            ) : null}
            <TextInput
              accessibilityLabel={`${exercise.name} set ${index + 1} ${loadFieldLabel(exercise.load_mode, set.entered_unit)}`}
              style={inputStyle}
              value={load}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => repsInput.current?.focus()}
              onChangeText={(value) => update("load", value)}
              onBlur={() => {
                void save();
              }}
            />
          </View>
        )}
        <View style={styles.inputColumn}>
          <TextInput
            ref={repsInput}
            accessibilityLabel={`${exercise.name} set ${index + 1} reps`}
            style={inputStyle}
            value={reps}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              void save();
            }}
            onChangeText={(value) => update("reps", value)}
            onBlur={() => {
              void save();
            }}
          />
        </View>
        <View style={styles.completeColumn}>
          <View style={styles.setActions}>
            <Button
              label={set.completed_at ? "✓" : "○"}
              secondary={!set.completed_at}
              selected={Boolean(set.completed_at)}
              accessibilityLabel={`${context}: ${set.completed_at ? "Mark incomplete" : "Complete set"}`}
              onPress={() => {
                void save(true);
              }}
            />
          </View>
        </View>
      </View>
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
