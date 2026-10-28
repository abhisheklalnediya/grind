import { Stack } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { useTheme } from "@/theme/useTheme";
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AuthGate>
  );
}
