import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { colors } from "@/theme/tokens";
export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Screen>
      <Heading title={title} />
      <View style={styles.panel}>
        <Text style={styles.text}>{description}</Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  text: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
});
