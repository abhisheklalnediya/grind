import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
export function Field({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ color: colors.secondary }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
    </View>
  );
}
export function Copy({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.text }}>{children}</Text>;
}
const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
  },
});
