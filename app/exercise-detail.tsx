import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { ExerciseDetailScreen } from "@/features/exercises";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGate>
      <ExerciseDetailScreen id={id ?? ""} />
    </AuthGate>
  );
}
