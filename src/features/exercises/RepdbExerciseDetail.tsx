import { useEffect, useState } from "react";
import {
  BackHandler,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/theme/useTheme";
import { exerciseImage, type BundledExercise } from "@/services/exercises";
export function RepdbExerciseDetail({
  exercise,
  onBack,
  available = false,
  loggingUnavailable = false,
}: {
  exercise: BundledExercise;
  onBack: () => void;
  available?: boolean;
  loggingUnavailable?: boolean;
}) {
  const { colors } = useTheme();
  const image = exerciseImage(exercise.id);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);
  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.control}
      >
        <Text style={{ color: colors.accentText }}>‹ Back to exercises</Text>
      </Pressable>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {exercise.name}
      </Text>
      <Text style={{ color: colors.secondary }}>
        {exercise.primaryMuscles.map((x) => x.replaceAll("_", " ")).join(", ")}{" "}
        · {exercise.equipment.replaceAll("_", " ")}
      </Text>
      {image && !failed ? (
        <Image
          testID="exercise-detail-image"
          source={image}
          onError={() => setFailed(true)}
          style={styles.image}
          accessibilityLabel={`${exercise.name} illustration`}
        />
      ) : (
        <Text style={{ color: colors.secondary }}>
          Illustration unavailable.
        </Text>
      )}
      {loggingUnavailable ? (
        <Text style={{ color: colors.secondary }}>
          Logging unavailable until this exercise is configured.
        </Text>
      ) : !available ? (
        <Text style={{ color: colors.secondary }}>
          Catalog preview · Import is required before adding this exercise to a
          workout.
        </Text>
      ) : null}
      <Text style={{ color: colors.text }}>{exercise.description}</Text>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontWeight: "700", fontSize: 20 }}
      >
        Instructions
      </Text>
      {exercise.instructions.map((step, index) => (
        <Text key={`${exercise.id}-${index}`} style={{ color: colors.text }}>
          {index + 1}. {step}
        </Text>
      ))}
      <Text
        accessibilityRole="link"
        accessibilityLabel="Exercise data by RepDB, opens website"
        onPress={() => {
          void Linking.openURL("https://repdb.co").catch(() => {});
        }}
        style={{ color: colors.accentText, minHeight: 48 }}
      >
        Exercise data by RepDB (repdb.co)
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  control: { minHeight: 48, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700" },
  image: { width: "100%", height: 220, resizeMode: "contain" },
});
