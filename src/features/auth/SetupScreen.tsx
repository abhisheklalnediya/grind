import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { saveSettings } from "@/services/grindAccount";
export function SetupScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [rest, setRest] = useState(120);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const query = useQueryClient();
  const save = async () => {
    setPending(true);
    setError("");
    try {
      await saveSettings(unit, rest, true);
      await query.invalidateQueries({ queryKey: ["grind-account"] });
    } catch {
      setError(
        "Couldn’t save your setup. Your choices are kept here; try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Heading
        title="Make it yours."
        subtitle="Two quick choices. You can change these anytime."
      />
      <Text style={styles.label}>Preferred weight unit</Text>
      <View style={styles.row}>
        {(["kg", "lb"] as const).map((value) => (
          <View key={value} style={styles.option}>
            <Button
              label={`${value}${unit === value ? " ✓" : ""}`}
              secondary={unit !== value}
              disabled={pending}
              onPress={() => setUnit(value)}
            />
          </View>
        ))}
      </View>
      <Text style={styles.label}>Default rest time</Text>
      <View style={styles.row}>
        {[60, 90, 120, 180].map((value) => (
          <View key={value} style={styles.option}>
            <Button
              label={`${value}s${rest === value ? " ✓" : ""}`}
              secondary={rest !== value}
              disabled={pending}
              onPress={() => setRest(value)}
            />
          </View>
        ))}
      </View>
      <Text style={styles.label}>
        Rest alerts are optional. We’ll ask when you first enable them.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={pending ? "Saving…" : "Continue"}
        disabled={pending}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: { minWidth: 72, flexGrow: 1 },
    error: { color: colors.error, fontSize: 16 },
  });
