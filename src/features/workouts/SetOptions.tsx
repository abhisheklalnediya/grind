import { View } from "react-native";
import { Button } from "@/components/Button";
import { LoadUnitControl } from "@/components/LoadUnitControl";
import type {
  TrainingSession,
  TrainingSet,
  WorkoutCommand,
} from "@/domain/training";
import { editedSet, moved } from "./fields";
import { styles } from "./setEditorStyles";
export function SetOptions({
  exercise,
  set,
  load,
  latest,
  send,
}: {
  exercise: TrainingSession["exercises"][number];
  set: TrainingSet;
  load: string;
  latest: () => { load: string; reps: string };
  send: (command: WorkoutCommand) => Promise<unknown>;
}) {
  const index = exercise.sets.findIndex((item) => item.id === set.id);
  const context = `${exercise.name} set ${index + 1}`;
  return (
    <View style={styles.tools}>
      <Button
        secondary
        label={set.set_type === "working" ? "Make warm-up" : "Make working"}
        accessibilityLabel={`${context}: ${set.set_type === "working" ? "Make warm-up" : "Make working"}`}
        onPress={() => {
          const input = editedSet(
            set,
            exercise.load_mode,
            latest().load,
            latest().reps,
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
          accessibilityContext={context}
          load={load}
          unit={set.entered_unit}
          onChangeUnit={(unit) => {
            const input = editedSet(
              set,
              exercise.load_mode,
              latest().load,
              latest().reps,
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
        accessibilityLabel={`${context}: Move set up`}
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
        accessibilityLabel={`${context}: Remove set`}
        onPress={() => {
          void send({
            type: "remove_set",
            exercise_id: exercise.id,
            set_id: set.id,
          });
        }}
      />
    </View>
  );
}
