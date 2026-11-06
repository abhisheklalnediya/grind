import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
type Props = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  tertiary?: boolean;
  muted?: boolean;
  selected?: boolean;
};
export function Button({
  label,
  accessibilityLabel = label,
  onPress,
  disabled = false,
  secondary = false,
  tertiary = false,
  muted = false,
  selected = false,
}: Props) {
  const { colors } = useTheme();
  const backgroundColor = disabled
    ? colors.disabledSurface
    : tertiary
      ? "transparent"
      : secondary
        ? colors.surface
        : colors.accent;
  const color = disabled
    ? colors.disabledText
    : tertiary
      ? muted
        ? colors.secondary
        : colors.accentText
      : secondary
        ? colors.text
        : colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: tertiary
            ? "transparent"
            : secondary
              ? colors.border
              : backgroundColor,
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "700" },
});
