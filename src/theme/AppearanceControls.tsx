import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { useTheme } from "./useTheme";
import type { AppearancePreference } from "./appearance";
const choices: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
export function AppearanceControls({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [savedScope, setSavedScope] = useState<string | null>(null);
  const choose = async (value: AppearancePreference) => {
    setSavedScope(null);
    try {
      await theme.setPreference(value);
      setSavedScope(theme.scope);
    } catch {
      /* The provider exposes a safe persistence error below. */
    }
  };
  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: theme.colors.text }]}
      >
        Appearance
      </Text>
      <Text style={[styles.copy, { color: theme.colors.secondary }]}>
        Follow your phone, or choose a look.
      </Text>
      <View style={styles.row}>
        {choices.map(({ value, label }) => (
          <View key={value} style={styles.option}>
            <Button
              label={label}
              selected={theme.preference === value}
              secondary={theme.preference !== value}
              disabled={disabled || theme.hydrating || theme.saving}
              onPress={() => {
                void choose(value);
              }}
            />
          </View>
        ))}
      </View>
      {theme.hydrating || theme.saving ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.secondary }}
        >
          {theme.hydrating ? "Loading appearance…" : "Saving appearance…"}
        </Text>
      ) : null}
      {theme.error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
            {theme.error}
          </Text>
          <Button
            label="Reload appearance"
            secondary
            disabled={theme.hydrating || theme.saving}
            onPress={theme.retry}
          />
        </>
      ) : null}
      {savedScope === theme.scope && !theme.error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.secondary }}
        >
          Appearance saved.
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  copy: { fontSize: 16, lineHeight: 24 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minWidth: 80, flexGrow: 1 },
});
