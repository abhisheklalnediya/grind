import { useEffect, useState } from "react";
import { StyleSheet, Alert, Modal, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
const pendingFailure = () => {};
export function RecoveryControls() {
  const training = useTraining();
  const { colors } = useTheme();
  const [adjusting, setAdjusting] = useState(false);
  const [seconds, setSeconds] = useState("120");
  const [restError, setRestError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!training.timerDeadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [training.timerDeadline]);
  return (
    <View style={styles.row}>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.secondary }}
      >
        {training.status === "saved"
          ? training.hasLocalChanges
            ? "Changes kept on this device · not saved yet"
            : "Saved"
          : training.status === "saving"
            ? "Saving…"
            : training.status === "loading"
              ? "Loading…"
              : training.error}
      </Text>
      {training.status === "error" && (
        <Button
          label="Retry changes"
          onPress={() => {
            void training.retry().catch(pendingFailure);
          }}
        />
      )}
      {training.status === "conflict" && (
        <>
          <Button
            label="Review server version"
            onPress={() => {
              void training.reviewConflict().catch(pendingFailure);
            }}
          />
          <Button
            secondary
            label="Reapply my changes"
            onPress={() =>
              Alert.alert(
                "Reapply changes?",
                "Apply your pending edits to the reviewed server version?",
                [
                  { text: "Keep reviewing", style: "cancel" },
                  {
                    text: "Reapply",
                    onPress: () => {
                      void training.reapply().catch(pendingFailure);
                    },
                  },
                ],
              )
            }
          />
          <Button
            secondary
            label="Discard my pending changes"
            onPress={() =>
              Alert.alert(
                "Discard pending edits?",
                "Your local pending edits will be removed.",
                [
                  { text: "Keep edits", style: "cancel" },
                  {
                    text: "Discard edits",
                    style: "destructive",
                    onPress: () => {
                      void training.discardPending().catch(pendingFailure);
                    },
                  },
                ],
              )
            }
          />
        </>
      )}
      {training.timerDeadline !== null && (
        <>
          <Button
            secondary
            label="Adjust rest"
            onPress={() => setAdjusting(true)}
          />
          <Modal
            visible={adjusting}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setAdjusting(false)}
          >
            <View
              style={[styles.sheet, { backgroundColor: colors.background }]}
            >
              <Text accessibilityRole="header" style={{ color: colors.text }}>
                Restart rest
              </Text>
              <TextInput
                accessibilityLabel="Rest duration seconds"
                value={seconds}
                keyboardType="number-pad"
                onChangeText={setSeconds}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
              />
              <Button
                label="Restart timer"
                onPress={() => {
                  if (
                    !/^\d+$/.test(seconds) ||
                    Number(seconds) < 15 ||
                    Number(seconds) > 3600
                  ) {
                    setRestError("Enter 15–3600 seconds.");
                    return;
                  }
                  void training
                    .restartRest(Number(seconds))
                    .then(() => {
                      setRestError("");
                      setAdjusting(false);
                    })
                    .catch(() => setRestError("Could not update rest. Retry."));
                }}
              />
              <Button
                secondary
                label="Close rest settings"
                onPress={() => setAdjusting(false)}
              />
              {restError ? (
                <Text accessibilityRole="alert" style={{ color: colors.error }}>
                  {restError}
                </Text>
              ) : null}
            </View>
          </Modal>
          <Text style={{ color: colors.text }}>
            Rest {Math.max(0, Math.ceil((training.timerDeadline - now) / 1000))}
            s
          </Text>
          <Button
            secondary
            label="Add 30 seconds"
            onPress={() => {
              void training.extendRest(30).catch(pendingFailure);
            }}
          />
          <Button
            secondary
            label="Skip rest"
            onPress={() => {
              void training.skipRest().catch(pendingFailure);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  row: { gap: 8 },
  sheet: { flex: 1, padding: 24, paddingTop: 60, gap: 16 },
  input: { minHeight: 48, borderWidth: 1, padding: 12, fontSize: 20 },
});
