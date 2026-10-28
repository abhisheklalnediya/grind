import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { WorkoutDetailScreen } from "@/features/history";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGate>
      <WorkoutDetailScreen id={id ?? ""} />
    </AuthGate>
  );
}
