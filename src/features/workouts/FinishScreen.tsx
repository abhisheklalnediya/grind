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
import { WorkoutElapsed } from "./WorkoutElapsed";
export function FinishScreen() {
  const training = useTraining();
  const client = useQueryClient();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const ready =
    canFinish(training.session) &&
    !training.hasLocalChanges &&
    training.status === "saved";
  const exercises = training.session?.exercises ?? [];
  const unfinished = exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => !set.completed_at).length,
    0,
  );
  const emptyExercises = exercises.filter(
    (exercise) => exercise.sets.length === 0,
  );
  return (
    <Screen>
      <Heading
        title="Ready to finish?"
        subtitle="Take a moment to check your workout."
      />
      <View
        style={[
          styles.receipt,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <ReceiptRow
          label="Workout"
          value={training.session?.name ?? "Workout"}
        />
        <ReceiptRow
          label="Completed sets"
          value={String(
            exercises.reduce(
              (count, exercise) =>
                count +
                exercise.sets.filter((set) => Boolean(set.completed_at)).length,
              0,
            ),
          )}
        />
        <View style={styles.receiptRow}>
          <Text style={{ color: colors.secondary }}>Time</Text>
          {training.session ? (
            <WorkoutElapsed startedAt={training.session.started_at} />
          ) : (
            <Text style={{ color: colors.text }}>—</Text>
          )}
        </View>
      </View>
      <RecoveryControls />
      {training.session?.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.row}>
          <Text style={{ color: colors.text }}>
            {exercise.name}:{" "}
            {exercise.sets.filter((set) => set.completed_at).length}/
            {exercise.sets.length} completed
          </Text>
          {exercise.sets.length === 0 ||
          exercise.sets.some((set) => !set.completed_at) ? (
            <Button
              secondary
              label={
                expandedExercise === exercise.id
                  ? `Hide review actions for ${exercise.name}`
                  : exercise.sets.length === 0
                    ? `Review empty ${exercise.name}`
                    : `Review unfinished ${exercise.name} (${exercise.sets.filter((set) => !set.completed_at).length})`
              }
              selected={expandedExercise === exercise.id}
              onPress={() =>
                setExpandedExercise((current) =>
                  current === exercise.id ? null : exercise.id,
                )
              }
            />
          ) : null}
          {expandedExercise === exercise.id && exercise.sets.length === 0 ? (
            <Button
              secondary
              label={`Remove empty ${exercise.name}`}
              onPress={() => {
                Alert.alert(
                  "Remove empty exercise?",
                  "This exercise, its notes, and its rest setting will be removed from this active workout.",
                  [
                    { text: "Keep exercise", style: "cancel" },
                    {
                      text: "Remove exercise",
                      style: "destructive",
                      onPress: () => {
                        void training
                          .command({
                            type: "remove_exercise",
                            exercise_id: exercise.id,
                          })
                          .catch(() =>
                            setError("Removal is pending. Retry changes."),
                          );
                      },
                    },
                  ],
                );
              }}
            />
          ) : null}
          {expandedExercise === exercise.id &&
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
              ))}
        </View>
      ))}
      {!ready && (
        <View accessibilityLiveRegion="polite" style={styles.blockers}>
          <Text accessibilityRole="header" style={{ color: colors.text }}>
            What needs attention
          </Text>
          {exercises.length === 0 ? (
            <Text style={{ color: colors.secondary }}>
              Add at least one exercise before finishing. Return to the workout
              to add it.
            </Text>
          ) : null}
          {unfinished > 0 ? (
            <Text style={{ color: colors.secondary }}>
              {unfinished} unfinished {unfinished === 1 ? "set" : "sets"}.
              Expand an exercise above to remove individual rows, or return to
              logging.
            </Text>
          ) : null}
          {emptyExercises.length > 0 ? (
            <Text style={{ color: colors.secondary }}>
              {emptyExercises.length} empty{" "}
              {emptyExercises.length === 1 ? "exercise" : "exercises"}. Remove
              each empty exercise above.
            </Text>
          ) : null}
          {training.hasLocalChanges ? (
            <Text style={{ color: colors.secondary }}>
              Some input is kept on this device and has not been acknowledged by
              the server.
            </Text>
          ) : null}
          {training.status === "saving" ? (
            <Text style={{ color: colors.secondary }}>
              Saving changes. Wait for server acknowledgement.
            </Text>
          ) : null}
          {training.status === "error" ? (
            <Text style={{ color: colors.secondary }}>
              A save failed. Retry changes before finishing.
            </Text>
          ) : null}
          {training.status === "conflict" ? (
            <Text style={{ color: colors.secondary }}>
              Review the server version and resolve the conflict before
              finishing.
            </Text>
          ) : null}
          {training.status === "loading" ? (
            <Text style={{ color: colors.secondary }}>
              Workout is still loading.
            </Text>
          ) : null}
        </View>
      )}
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
      <Button
        secondary
        label="Return to workout"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/workout")
        }
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  blockers: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 12 },
  receipt: { gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 },
  receiptRow: {
    minHeight: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
});

function ReceiptRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.receiptRow}>
      <Text style={{ color: colors.secondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "700", flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}
