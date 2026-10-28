import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { Screen } from "@/components/Screen";
import { useTraining } from "@/features/training";
import { canFinish } from "@/services/training/outboxState";
import { useTheme } from "@/theme/useTheme";
import { RecoveryControls } from "./RecoveryControls";
export function FinishScreen() {
  const training = useTraining();
  const client = useQueryClient();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ready =
    canFinish(training.session) &&
    !training.hasLocalChanges &&
    training.status === "saved";
  return (
    <Screen>
      <Heading
        title="Finish workout"
        subtitle="Review your completed sets. Remove unfinished rows explicitly before saving."
      />
      <RecoveryControls />
      {training.session?.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.row}>
          <Text style={{ color: colors.text }}>
            {exercise.name}:{" "}
            {exercise.sets.filter((set) => set.completed_at).length}/
            {exercise.sets.length} completed
          </Text>
          {exercise.sets.length === 0 ? (
            <Button
              secondary
              label={`Remove empty ${exercise.name}`}
              onPress={() => {
                void training
                  .command({
                    type: "remove_exercise",
                    exercise_id: exercise.id,
                  })
                  .catch(() => setError("Removal is pending. Retry changes."));
              }}
            />
          ) : (
            exercise.sets
              .filter((set) => !set.completed_at)
              .map((set) => (
                <Button
                  key={set.id}
                  secondary
                  label={`Remove unfinished ${exercise.name} set ${set.position + 1}`}
                  onPress={() =>
                    Alert.alert(
                      "Remove unfinished set?",
                      "This row and its entered values will be removed.",
                      [
                        { text: "Keep set", style: "cancel" },
                        {
                          text: "Remove set",
                          style: "destructive",
                          onPress: () => {
                            void training
                              .command({
                                type: "remove_set",
                                exercise_id: exercise.id,
                                set_id: set.id,
                              })
                              .catch(() =>
                                setError("Removal is pending. Retry changes."),
                              );
                          },
                        },
                      ],
                    )
                  }
                />
              ))
          )}
        </View>
      ))}
      {!ready && (
        <Text style={{ color: colors.secondary }}>
          Finish requires completed sets, no empty exercises, and all changes
          saved. Return to the workout to complete or remove unfinished rows.
        </Text>
      )}
      <Button
        secondary
        label="Return to workout"
        onPress={() => router.back()}
      />
      <Button
        disabled={!ready || busy}
        label="Finish and save"
        onPress={() => {
          setBusy(true);
          void training
            .finish()
            .then(async (session) => {
              await Promise.all(
                [
                  "history",
                  "previous",
                  "exercise-previous",
                  "exercise-history",
                ].map((key) => client.invalidateQueries({ queryKey: [key] })),
              );
              router.replace(`/workout/summary?id=${session.id}`);
            })
            .catch(() =>
              setError(
                "Workout is not confirmed saved. Retry when all changes are saved.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { gap: 12 }, row: { gap: 8 } });
