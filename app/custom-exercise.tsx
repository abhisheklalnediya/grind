import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { CustomExerciseScreen } from "@/features/exercises";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGate>
      <CustomExerciseScreen {...(id ? { id } : {})} />
    </AuthGate>
  );
}
