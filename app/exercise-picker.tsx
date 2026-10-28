import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { ExercisePickerScreen } from "@/features/exercises";
export default function Route() {
  const { target } = useLocalSearchParams<{ target: string }>();
  return (
    <AuthGate>
      <ExercisePickerScreen
        target={target === "routine" ? "routine" : "workout"}
      />
    </AuthGate>
  );
}
