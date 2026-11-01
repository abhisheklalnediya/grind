import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { ExerciseEditor } from "./ExerciseEditor";
import { useWorkoutDraft } from "./useWorkoutDraft";
import { RecoveryControls } from "./RecoveryControls";
export function WorkoutScreen() {
  const training = useTraining();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const name = useWorkoutDraft(
    `workout:${training.session?.id}:name`,
    training.session?.name ?? "",
    setError,
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.topBar}>
          <Button
            secondary
            label="Back"
            accessibilityLabel="Minimize workout"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
          />
          <View style={styles.title}>
            {editingName ? (
              <TextInput
                accessibilityLabel="Workout name"
                value={name.value}
                maxLength={80}
                onChangeText={name.change}
                onBlur={() => {
                  if (name.latest.current.trim())
                    void training
                      .command({
                        type: "rename_workout",
                        name: name.latest.current.trim(),
                      })
                      .catch(() =>
                        setError(
                          "Workout name was not saved. Retry changes above.",
                        ),
                      );
                }}
                style={[
                  styles.nameInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit workout name, ${name.value || "Workout"}`}
                onPress={() => setEditingName(true)}
                style={styles.namePressable}
              >
                <Text
                  accessibilityRole="header"
                  numberOfLines={1}
                  style={[styles.nameText, { color: colors.text }]}
                >
                  {name.value || "Workout"}
                </Text>
              </Pressable>
            )}
          </View>
          {training.session?.status === "active" && (
            <Button
              label="Finish"
              onPress={() => router.push("/workout/finish")}
            />
          )}
        </View>
        <RecoveryControls elapsedStartedAt={training.session?.started_at} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {error ? (
            <Text accessibilityRole="alert" style={{ color: colors.error }}>
              {error}
            </Text>
          ) : null}
          {training.session?.status === "active" && (
            <>
              {editingName ? (
                <Button
                  secondary
                  label="Done editing name"
                  onPress={() => setEditingName(false)}
                />
              ) : null}
              {training.session.exercises.length === 0 ? (
                <View style={styles.empty}>
                  <Text
                    accessibilityRole="header"
                    style={{ color: colors.text, fontSize: 20 }}
                  >
                    Start your workout
                  </Text>
                  <Text style={{ color: colors.secondary }}>
                    Add an exercise to begin logging sets. Your workout stays
                    active when minimized.
                  </Text>
                  <Button
                    secondary
                    label="Add your first exercise"
                    onPress={() =>
                      router.push("/exercise-picker?target=workout")
                    }
                  />
                </View>
              ) : (
                training.session.exercises.map((exercise) => (
                  <ExerciseEditor key={exercise.id} exercise={exercise} />
                ))
              )}
              {training.session.exercises.length > 0 ? (
                <Button
                  secondary
                  label="＋ Add exercise"
                  onPress={() => router.push("/exercise-picker?target=workout")}
                />
              ) : null}
              <Button
                secondary
                label="Discard workout"
                onPress={() =>
                  Alert.alert(
                    "Discard workout?",
                    "This workout will not appear in completed history.",
                    [
                      { text: "Keep workout", style: "cancel" },
                      {
                        text: "Discard workout",
                        style: "destructive",
                        onPress: () => {
                          void training
                            .cancel()
                            .then(() => router.replace("/(tabs)"))
                            .catch(() =>
                              setError(
                                "Workout could not be cancelled. Retry changes above.",
                              ),
                            );
                        },
                      },
                    ],
                  )
                }
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { flex: 1, minWidth: 0, justifyContent: "center" },
  nameText: { fontSize: 18, fontWeight: "700" },
  namePressable: { minHeight: 48, justifyContent: "center" },
  nameInput: {
    minHeight: 48,
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  empty: { gap: 12, padding: 20, borderWidth: 1, borderRadius: 12 },
});
