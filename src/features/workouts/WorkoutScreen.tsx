import { useState } from "react";
import { Alert, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { Screen } from "@/components/Screen";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { ExerciseEditor } from "./ExerciseEditor";
import { useWorkoutDraft } from "./useWorkoutDraft";
import { RecoveryControls } from "./RecoveryControls";
const pendingFailure = () => {};
export function WorkoutScreen() {
  const training = useTraining();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const name = useWorkoutDraft(
    `workout:${training.session?.id}:name`,
    training.session?.name ?? "",
    setError,
  );
  return (
    <Screen>
      <Heading title={training.session?.name ?? "Active workout"} />
      <RecoveryControls />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      {training.session?.status === "active" && (
        <>
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
                  .catch(pendingFailure);
            }}
            style={{ minHeight: 48, color: colors.text }}
          />
          {training.session.exercises.map((exercise) => (
            <ExerciseEditor key={exercise.id} exercise={exercise} />
          ))}
          <Button
            label="Add exercise"
            onPress={() => router.push("/exercise-picker?target=workout")}
          />
          <Button
            label="Review and finish"
            onPress={() => router.push("/workout/finish")}
          />
          <Button
            secondary
            label="Cancel workout"
            onPress={() =>
              Alert.alert(
                "Cancel workout?",
                "This workout will not appear in completed history.",
                [
                  { text: "Keep workout", style: "cancel" },
                  {
                    text: "Cancel workout",
                    style: "destructive",
                    onPress: () => {
                      void training
                        .cancel()
                        .then(() => router.replace("/(tabs)"))
                        .catch(pendingFailure);
                    },
                  },
                ],
              )
            }
          />
        </>
      )}
    </Screen>
  );
}
