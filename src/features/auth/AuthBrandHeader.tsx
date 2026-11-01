import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

const lockup = require("../../../assets/branding/grind-auth-lockup.png");

export function AuthBrandHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.brandPanel}>
        <Image
          accessibilityLabel="GRIND Gym Logger"
          accessibilityRole="image"
          accessible
          resizeMode="contain"
          source={lockup}
          style={styles.logo}
        />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
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
  group: { gap: 12, marginVertical: 8 },
  brandPanel: {
    minHeight: 112,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#080A0C",
    borderColor: "#252A2E",
    borderWidth: 1,
    borderRadius: 20,
  },
  logo: { width: "100%", height: 82 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 16, lineHeight: 24 },
});
