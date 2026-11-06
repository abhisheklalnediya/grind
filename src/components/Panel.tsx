import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function Panel({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
});
