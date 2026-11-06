import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

export type ExerciseDetailTab = "overview" | "history";

export function ExerciseDetailTabs({
  selected,
  onSelect,
}: {
  selected: ExerciseDetailTab;
  onSelect: (tab: ExerciseDetailTab) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      testID="exercise-detail-tabs"
      style={[styles.tabs, { borderBottomColor: colors.border }]}
    >
      {(["overview", "history"] as const).map((tab) => (
        <Pressable
          key={tab}
          role="tab"
          accessibilityLabel={tab === "overview" ? "Overview" : "History"}
          accessibilityState={{ selected: selected === tab }}
          nativeID={`exercise-detail-tab-${tab}`}
          onPress={() => onSelect(tab)}
          style={styles.tab}
        >
          <Text
            style={{
              color: selected === tab ? colors.accentText : colors.secondary,
            }}
          >
            {tab === "overview" ? "Overview" : "History"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
