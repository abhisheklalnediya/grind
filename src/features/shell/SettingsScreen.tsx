import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { AppearanceControls } from "@/theme/AppearanceControls";
import { loadSettings, saveSettings } from "@/services/grindAccount";
import { useAuth } from "@/features/auth/AuthProvider";
import { authService } from "@/features/auth/authService";
type Guard = {
  beforeSignOut?: () => Promise<boolean>;
  settingsPort?: {
    load: typeof loadSettings;
    save: (
      unit: "kg" | "lb",
      seconds: number,
    ) => ReturnType<typeof saveSettings>;
  };
};
export function SettingsScreen({ beforeSignOut, settingsPort }: Guard = {}) {
  const { session } = useAuth();
  if (!session)
    return (
      <Screen>
        <Heading title="Sign in to change your preferences." />
      </Screen>
    );
  return (
    <SettingsContent
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ""}
      {...(beforeSignOut ? { beforeSignOut } : {})}
      {...(settingsPort ? { settingsPort } : {})}
    />
  );
}
function SettingsContent({
  userId,
  email,
  beforeSignOut,
  settingsPort,
}: { userId: string; email: string } & Guard) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const query = useQueryClient();
  const settings = useQuery({
    queryKey: ["grind-settings", userId],
    queryFn: settingsPort?.load ?? loadSettings,
    retry: false,
  });
  const [unit, setUnit] = useState<"kg" | "lb" | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const persist = async () => {
    if (!settings.data) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await (settingsPort?.save ?? saveSettings)(
        unit ?? settings.data.preferred_unit,
        rest ?? settings.data.default_rest_seconds,
      );
      await query.invalidateQueries({ queryKey: ["grind-settings"] });
      setUnit(null);
      setRest(null);
      setSaved(true);
    } catch {
      setError("Your preferences weren’t saved. Please retry.");
    } finally {
      setPending(false);
    }
  };
  const logout = async () => {
    setPending(true);
    setError("");
    try {
      if (beforeSignOut && !(await beforeSignOut())) {
        setPending(false);
        return;
      }
      await authService.signOut();
    } catch {
      setError("Couldn’t sign out. Please try again.");
      setPending(false);
    }
  };
  return (
    <Screen>
      <Heading title="Settings" subtitle={email} />
      <AppearanceControls disabled={pending} />
      {settings.isPending ? (
        <Text style={styles.label}>Loading your preferences…</Text>
      ) : settings.isError ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            Couldn’t load your preferences.
          </Text>
          <Button
            label="Retry"
            onPress={() => {
              void settings.refetch();
            }}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Preferred unit</Text>
          <View style={styles.row}>
            {(["kg", "lb"] as const).map((value) => (
              <View key={value} style={styles.option}>
                <Button
                  label={`${value}${(unit ?? settings.data.preferred_unit) === value ? " ✓" : ""}`}
                  secondary={(unit ?? settings.data.preferred_unit) !== value}
                  disabled={pending}
                  onPress={() => {
                    setUnit(value);
                    setSaved(false);
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={styles.label}>Default rest</Text>
          <View style={styles.row}>
            {[60, 90, 120, 180].map((value) => (
              <View key={value} style={styles.option}>
                <Button
                  label={`${value}s${(rest ?? settings.data.default_rest_seconds) === value ? " ✓" : ""}`}
                  secondary={
                    (rest ?? settings.data.default_rest_seconds) !== value
                  }
                  disabled={pending}
                  onPress={() => {
                    setRest(value);
                    setSaved(false);
                  }}
                />
              </View>
            ))}
          </View>
          <Button
            label={pending ? "Saving…" : "Save preferences"}
            disabled={pending || (unit === null && rest === null)}
            onPress={() => {
              void persist();
            }}
          />
        </>
      )}
      {saved ? (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          Preferences saved.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.label}>
        Signing out here affects Grind only. Your BabyBoo account and data stay
        intact.
      </Text>
      <Button
        label="Sign out of Grind"
        secondary
        disabled={pending}
        onPress={() => {
          void logout();
        }}
      />
    </Screen>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
    error: { color: colors.error, fontSize: 16 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: { flexGrow: 1, minWidth: 72 },
  });
