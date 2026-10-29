import { ResumeStrip } from "@/features/home/ResumeStrip";
import { BottomTabBar, type BottomTabBarProps, Tabs } from "expo-router/tabs";
import { AuthGate } from "@/features/auth/AuthGate";
import { useTheme } from "@/theme/useTheme";
import { TabIcon } from "@/components/TabIcon";
import { View } from "react-native";
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <AuthGate>
      <Tabs
        tabBar={(props: BottomTabBarProps) => (
          <View testID="bottom-tabs-shell">
            <ResumeStrip />
            <BottomTabBar {...props} />
          </View>
        )}
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
        <Tabs.Screen
          name="index"
          options={{
            title: "Train",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="train" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="history" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: "Exercises",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="exercises" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="settings" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </AuthGate>
  );
}
