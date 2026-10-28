import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { RoutineEditorScreen } from "@/features/routines";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AuthGate>
      <RoutineEditorScreen {...(id ? { id } : {})} />
    </AuthGate>
  );
}
