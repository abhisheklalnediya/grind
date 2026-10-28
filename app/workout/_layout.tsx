import { Stack } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
export default function WorkoutLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGate>
  );
}
