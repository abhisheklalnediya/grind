import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.brand, { color: colors.accentText }]}>GRIND</Text>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10, marginVertical: 12 },
  brand: { letterSpacing: 3, fontSize: 12, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 16, lineHeight: 24 },
});
