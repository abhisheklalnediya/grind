import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { RoutineDetailScreen } from "@/features/routines";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGate>
      <RoutineDetailScreen id={id ?? ""} />
    </AuthGate>
  );
}
