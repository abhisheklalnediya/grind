import { ResumeStrip } from "@/features/home/ResumeStrip";
import { Tabs } from "expo-router";
import { AuthGate } from "@/features/auth/AuthGate";
import { useTheme } from "@/theme/useTheme";
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <AuthGate>
      <ResumeStrip />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentText,
          tabBarInactiveTintColor: colors.secondary,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Train" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen name="exercises" options={{ title: "Exercises" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </AuthGate>
  );
}
