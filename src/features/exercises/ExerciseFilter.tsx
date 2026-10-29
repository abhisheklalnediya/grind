import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
export function ExerciseFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} filter`}
        accessibilityValue={{
          text: value
            ? value.replaceAll("_", " ")
            : label === "Muscle"
              ? "All muscles"
              : "All equipment",
        }}
        onPress={() => setOpen(true)}
        style={[
          styles.button,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text numberOfLines={1} style={{ color: colors.text }}>
          {value
            ? value.replaceAll("_", " ")
            : label === "Muscle"
              ? "All muscles"
              : "All equipment"}{" "}
          ▾
        </Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}
              >
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${label} filter`}
                onPress={() => setOpen(false)}
                style={styles.close}
              >
                <Text style={{ color: colors.accentText }}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={["", ...options]}
              keyExtractor={(item) => item || "all"}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === value }}
                  onPress={() => choose(item)}
                  style={[styles.option, { borderColor: colors.border }]}
                >
                  <Text
                    style={{
                      color: item === value ? colors.accentText : colors.text,
                    }}
                  >
                    {item
                      ? item.replaceAll("_", " ")
                      : label === "Muscle"
                        ? "All muscles"
                        : "All equipment"}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 0 },
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  overlay: { flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" },
  sheet: {
    height: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
  },
  close: { minHeight: 48, justifyContent: "center" },
  option: { minHeight: 48, justifyContent: "center", borderBottomWidth: 1 },
});
