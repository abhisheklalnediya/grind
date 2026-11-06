import { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export type SetTypeOption = {
  value: string;
  label: string;
  shortLabel: string;
};

export function SetTypeSelector({
  value,
  options,
  onSelect,
  onMore,
  moreLabel = "More set actions",
  context,
  completed = false,
  currentOption,
}: {
  value: string;
  options: SetTypeOption[];
  onSelect: (value: string) => void;
  onMore?: () => void;
  moreLabel?: string;
  context?: string;
  completed?: boolean;
  currentOption?: SetTypeOption;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const selected =
    options.find((option) => option.value === value) ??
    (currentOption?.value === value ? currentOption : undefined);
  const close = () => {
    setOpen(false);
    setPendingType(null);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${context ? `${context}: ` : ""}Set type: ${selected?.label ?? value}`}
        accessibilityHint="Choose a set type"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={[styles.trigger, { borderColor: colors.border }]}
      >
        <View style={styles.triggerContent}>
          <Text
            numberOfLines={1}
            style={[styles.triggerText, { color: colors.text }]}
          >
            {selected?.shortLabel ?? value}
          </Text>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ color: colors.secondary, fontSize: 10 }}
          >
            ▾
          </Text>
        </View>
      </Pressable>
      <Modal
        testID="set-type-modal"
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View style={[styles.backdrop, { backgroundColor: "#0009" }]}>
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: colors.background }]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}
            >
              {pendingType ? (
                <>
                  <Text
                    accessibilityRole="header"
                    style={[styles.heading, { color: colors.text }]}
                  >
                    Change {context ?? "completed set"} to{" "}
                    {options.find((option) => option.value === pendingType)
                      ?.label ?? pendingType}
                    ?
                  </Text>
                  <Text style={{ color: colors.secondary }}>
                    This marks the set incomplete and ends any associated rest
                    timer. Your entered values stay.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onSelect(pendingType);
                      close();
                    }}
                    style={[styles.option, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[styles.optionText, { color: colors.accentText }]}
                    >
                      Change type
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text
                    accessibilityRole="header"
                    style={[styles.heading, { color: colors.text }]}
                  >
                    Choose set type
                  </Text>
                  {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => {
                          if (completed && option.value !== value)
                            setPendingType(option.value);
                          else {
                            onSelect(option.value);
                            close();
                          }
                        }}
                        style={[
                          styles.option,
                          { borderColor: colors.border },
                          isSelected && { backgroundColor: colors.surface },
                        ]}
                      >
                        <Text
                          style={[styles.optionText, { color: colors.text }]}
                        >
                          {option.label}
                        </Text>
                        {isSelected ? (
                          <Text
                            accessibilityLabel="Selected"
                            style={{ color: colors.accentText }}
                          >
                            ✓
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {onMore ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        close();
                        onMore();
                      }}
                      style={[styles.option, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.optionText, { color: colors.text }]}>
                        {moreLabel}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={[styles.cancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  triggerContent: { flexDirection: "row", alignItems: "center", gap: 3 },
  triggerText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetContent: { padding: 16, paddingBottom: 24 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  option: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  optionText: { fontSize: 16 },
  cancel: {
    minHeight: 48,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
