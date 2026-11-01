import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import {
  isSetCompleteable,
  type TrainingSession,
  type TrainingSet,
} from "@/domain/training";
import { useTraining } from "@/features/training";
import { rawFieldKey } from "@/services/training/outboxState";
import { useTheme } from "@/theme/useTheme";
import { moved } from "./fields";
import { styles } from "./setEditorStyles";

type Exercise = TrainingSession["exercises"][number];
export function TimedSetEditor({
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
  const [error, setError] = useState("");
  const [options, setOptions] = useState(false);
  const [focused, setFocused] = useState<"duration" | "distance" | null>(null);
  const distanceInput = useRef<TextInput>(null);
  const durationInput = useRef<TextInput>(null);
  const durationKey = rawFieldKey(exercise.id, set.id, "duration");
  const distanceKey = rawFieldKey(exercise.id, set.id, "distance");
  const duration =
    training.raw[durationKey] ?? String(set.duration_seconds ?? "");
  const distance = training.raw[distanceKey] ?? set.entered_distance ?? "";
  const latest = useRef({ duration, distance });
  const writes = useRef(0);
  useEffect(() => {
    if (!writes.current) latest.current = { duration, distance };
  }, [duration, distance]);
  const update = (field: "duration" | "distance", value: string) => {
    latest.current[field] = value;
    writes.current++;
    void training
      .setRaw(field === "duration" ? durationKey : distanceKey, value)
      .catch(() => setError("Could not preserve input. Retry."))
      .finally(() => {
        writes.current--;
      });
  };
  const submit = async (
    complete = false,
    unit = set.distance_unit ?? "km",
    setType = set.set_type,
  ) => {
    if (complete && set.completed_at) {
      try {
        await training.command({
          type: "complete_set",
          exercise_id: exercise.id,
          set_id: set.id,
          completed: false,
        });
        setError("");
      } catch {
        setError("Change is pending. Use Retry above.");
      }
      return;
    }
    const time = latest.current.duration;
    const length = latest.current.distance;
    if (
      time &&
      (!/^\d+$/.test(time) || Number(time) < 1 || Number(time) > 86400)
    ) {
      setError("Duration must be a whole number from 1 to 86400 seconds.");
      return;
    }
    if (
      length &&
      (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(length) ||
        Number(length) <= 0 ||
        Number(length) > 100000)
    ) {
      setError(
        "Distance must be a positive number up to 100000, with at most 3 decimals.",
      );
      return;
    }
    const input = {
      id: set.id,
      position: set.position,
      set_type: setType,
      entered_load: null,
      entered_unit: set.entered_unit,
      reps: null,
      duration_seconds: time ? Number(time) : null,
      entered_distance:
        exercise.tracking_type === "distance_duration" && length
          ? length
          : null,
      distance_unit:
        exercise.tracking_type === "distance_duration" ? unit : null,
    };
    if (
      complete &&
      !set.completed_at &&
      !isSetCompleteable(input, exercise.load_mode, exercise.tracking_type)
    ) {
      setError(
        !time
          ? "Enter a duration before completing this set."
          : exercise.tracking_type === "distance_duration" && !length
            ? "Enter a distance before completing this set."
            : "Enter the required duration and distance.",
      );
      return;
    }
    try {
      if (
        input.duration_seconds !== (set.duration_seconds ?? null) ||
        input.entered_distance !== (set.entered_distance ?? null) ||
        input.distance_unit !== (set.distance_unit ?? null) ||
        input.set_type !== set.set_type ||
        training.raw[durationKey] !== undefined ||
        training.raw[distanceKey] !== undefined
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
      setError("");
    } catch {
      setError("Change is pending. Use Retry above.");
    }
  };
  const index = exercise.sets.findIndex((item) => item.id === set.id);
  const workingOrdinal = exercise.sets
    .slice(0, index + 1)
    .filter((row) => row.set_type === "working").length;
  const context = `${exercise.name} set ${index + 1}`;
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
      <View style={[styles.loggingRow, styles.tableRow]}>
        <Text
          accessibilityLabel={`${context} · ${set.set_type}${set.completed_at ? " · Completed" : ""}`}
          style={[
            styles.setValue,
            { color: colors.text, fontSize: 15, fontWeight: "700" },
          ]}
        >
          {set.set_type === "warmup" ? "W" : workingOrdinal}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.previousValue, { color: colors.secondary }]}
        >
          {previous}
        </Text>
        <View style={styles.timedInput}>
          <TextInput
            ref={durationInput}
            accessibilityLabel={`${context} duration seconds`}
            value={duration}
            keyboardType="number-pad"
            returnKeyType={
              exercise.tracking_type === "distance_duration" ? "next" : "done"
            }
            onFocus={() => setFocused("duration")}
            onSubmitEditing={() => {
              if (exercise.tracking_type === "distance_duration")
                distanceInput.current?.focus();
              else {
                Keyboard.dismiss();
                setFocused(null);
                void submit();
              }
            }}
            onChangeText={(value) => update("duration", value)}
            onBlur={() => {
              setFocused((current) =>
                current === "duration" ? null : current,
              );
              void submit();
            }}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, width: "100%" },
            ]}
          />
        </View>
        {exercise.tracking_type === "distance_duration" && (
          <View style={styles.timedInput}>
            <TextInput
              ref={distanceInput}
              accessibilityLabel={`${context} distance`}
              value={distance}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onFocus={() => setFocused("distance")}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                setFocused(null);
                void submit();
              }}
              onChangeText={(value) => update("distance", value)}
              onBlur={() => {
                setFocused((current) =>
                  current === "distance" ? null : current,
                );
                void submit();
              }}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  width: "100%",
                },
              ]}
            />
          </View>
        )}
        <Button
          label={set.completed_at ? "✓" : "○"}
          selected={Boolean(set.completed_at)}
          accessibilityLabel={`${context}: ${set.completed_at ? "Mark incomplete" : "Complete set"}`}
          onPress={() => {
            Keyboard.dismiss();
            setFocused(null);
            void submit(true);
          }}
        />
      </View>
      {focused && (
        <View style={styles.tools}>
          <Button
            secondary
            label="Done editing set"
            accessibilityLabel={`${context}: Done editing set`}
            onPress={() => {
              Keyboard.dismiss();
              setFocused(null);
              void submit();
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
        <>
          {exercise.tracking_type === "distance_duration" && (
            <>
              <Button
                secondary
                label={`Distance unit: ${set.distance_unit ?? "km"}`}
                accessibilityLabel={`${context} distance unit`}
                disabled={distance !== ""}
                onPress={() => {
                  if (latest.current.distance !== "") {
                    setError("Clear distance to change its unit.");
                    return;
                  }
                  void submit(
                    false,
                    (set.distance_unit ?? "km") === "km" ? "mi" : "km",
                  );
                }}
              />
              {distance !== "" ? (
                <Text style={{ color: colors.secondary }}>
                  Clear distance to change its unit.
                </Text>
              ) : null}
            </>
          )}
          <Button
            secondary
            label={set.set_type === "working" ? "Make warm-up" : "Make working"}
            accessibilityLabel={`${context}: ${set.set_type === "working" ? "Make warm-up" : "Make working"}`}
            onPress={() => {
              void submit(
                false,
                set.distance_unit ?? "km",
                set.set_type === "working" ? "warmup" : "working",
              );
            }}
          />
          <Button
            secondary
            label="Move set up"
            disabled={index === 0}
            onPress={() => {
              void training
                .command({
                  type: "reorder_sets",
                  exercise_id: exercise.id,
                  ids: moved(
                    exercise.sets.map((item) => item.id),
                    index,
                    -1,
                  ),
                })
                .catch(() => setError("Change is pending. Use Retry above."));
            }}
          />
          <Button
            secondary
            label="Remove set"
            onPress={() => {
              const remove = () =>
                void training
                  .command({
                    type: "remove_set",
                    exercise_id: exercise.id,
                    set_id: set.id,
                  })
                  .catch(() => setError("Change is pending. Use Retry above."));
              const populated =
                Boolean(set.completed_at) ||
                (set.duration_seconds ?? null) !== null ||
                (set.entered_distance ?? null) !== null ||
                latest.current.duration !== "" ||
                latest.current.distance !== "";
              if (!populated) return remove();
              Alert.alert(
                "Remove set and entered work?",
                "This set and its completed status and entered values will be removed.",
                [
                  { text: "Keep set", style: "cancel" },
                  { text: "Remove set", style: "destructive", onPress: remove },
                ],
              );
            }}
          />
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
