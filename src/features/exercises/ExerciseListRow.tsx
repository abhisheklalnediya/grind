import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
export function ExerciseListRow({
  name,
  subtitle,
  image,
  custom = false,
  existingCatalog = false,
  onPress,
}: {
  name: string;
  subtitle: string;
  image?: ImageSourcePropType | undefined;
  custom?: boolean;
  existingCatalog?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${subtitle}${custom ? ", my exercise" : existingCatalog ? ", existing catalog exercise" : ""}`}
      onPress={onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View
        style={[
          styles.thumb,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {image && !failed ? (
          <Image
            testID="exercise-row-image"
            source={image}
            onError={() => setFailed(true)}
            style={styles.image}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ color: colors.secondary, fontSize: 24 }}
          >
            ◇
          </Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>
          {name}
          {custom ? (
            <Text style={{ color: colors.accentText, fontSize: 10 }}>
              {" "}
              MY EXERCISE
            </Text>
          ) : existingCatalog ? (
            <Text style={{ color: colors.secondary, fontSize: 10 }}>
              {" "}
              EXISTING
            </Text>
          ) : null}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      </View>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ color: colors.secondary, fontSize: 24 }}
      >
        ›
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  thumb: {
    height: 56,
    width: 56,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%", resizeMode: "contain" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 5 },
});
