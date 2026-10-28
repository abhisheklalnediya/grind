import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { joinGrind } from "@/services/grindAccount";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { TrainingDefaultsProvider } from "@/features/preferences";
import { TrainingProvider } from "@/features/training";
import { readEnvironment } from "@/services/environment";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useTheme } from "@/theme/useTheme";
export function AppRuntime({
  children,
  onCompleted,
}: PropsWithChildren<{ onCompleted?: () => void }>) {
  const { session, recovery } = useAuth();
  const account = useQuery({
    queryKey: ["grind-account", session?.user.id],
    queryFn: joinGrind,
    enabled: false,
  });
  const ready = Boolean(
    session && account.data?.setup_completed_at && !recovery,
  );
  const scope = `${readEnvironment()?.url ?? "unconfigured"}/${session?.user.id ?? "signed-out"}`;
  return (
    <ThemeProvider scope={scope}>
      <TrainingProvider
        scope={scope}
        {...(onCompleted ? { onCompleted } : {})}
        enabled={ready}
        {...(session ? { userId: session.user.id } : {})}
      >
        <TrainingDefaultsProvider
          {...(session ? { userId: session.user.id } : {})}
        >
          {children}
        </TrainingDefaultsProvider>
      </TrainingProvider>
    </ThemeProvider>
  );
}
export function AppNavigator() {
  const { colors, mode } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
