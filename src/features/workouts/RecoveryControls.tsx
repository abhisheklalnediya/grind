import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { WorkoutElapsed } from "./WorkoutElapsed";

const pendingFailure = () => {};

export function RecoveryControls({
  elapsedStartedAt,
}: {
  elapsedStartedAt?: string | undefined;
}) {
  const training = useTraining();
  const { colors } = useTheme();
  const [adjusting, setAdjusting] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(false);
  const [reviewedConflict, setReviewedConflict] = useState(false);
  const [reviewingConflict, setReviewingConflict] = useState(false);
  const [conflictReviewError, setConflictReviewError] = useState("");
  const [conflictActionError, setConflictActionError] = useState("");
  const [seconds, setSeconds] = useState("120");
  const [restError, setRestError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [announcedDeadline, setAnnouncedDeadline] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (training.timerDeadline === null) return;
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(refresh);
      clearInterval(timer);
    };
  }, [training.timerDeadline]);

  const remaining =
    training.timerDeadline === null
      ? null
      : Math.max(0, Math.ceil((training.timerDeadline - now) / 1000));
  const serverReviewReady =
    reviewedConflict &&
    training.error ===
      "Review changes, then reapply or discard your local edits.";

  const loadServerVersion = () => {
    setReviewedConflict(false);
    setConflictReviewError("");
    setReviewingConflict(true);
    void training
      .reviewConflict()
      .then(() => setReviewedConflict(true))
      .catch(() =>
        setConflictReviewError(
          "Could not load the server version. Check your connection and retry.",
        ),
      )
      .finally(() => setReviewingConflict(false));
  };

  const resolveConflict = () => {
    setConflictActionError("");
    setConflictDetails(true);
  };

  useEffect(() => {
    if (
      training.timerDeadline === null ||
      remaining !== 0 ||
      announcedDeadline === training.timerDeadline
    )
      return;
    const deadline = training.timerDeadline;
    const announce = setTimeout(() => setAnnouncedDeadline(deadline), 0);
    return () => clearTimeout(announce);
  }, [announcedDeadline, remaining, training.timerDeadline]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.statusRow}>
        {elapsedStartedAt ? (
          <WorkoutElapsed startedAt={elapsedStartedAt} />
        ) : null}
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.status, { color: colors.secondary }]}
        >
          {training.status === "saved"
            ? training.hasLocalChanges
              ? "Changes kept on this device · not saved yet"
              : "Saved"
            : training.status === "saving"
              ? "Saving…"
              : training.status === "loading"
                ? "Loading…"
                : training.status === "conflict"
                  ? reviewingConflict
                    ? "Loading current server version…"
                    : conflictReviewError ||
                      (serverReviewReady
                        ? "Server version loaded. Review the workout before resolving."
                        : training.error)
                  : training.error}
        </Text>
        {training.status === "error" && (
          <Button
            secondary
            label="Retry changes"
            onPress={() => {
              void training.retry().catch(pendingFailure);
            }}
          />
        )}
        {training.status === "conflict" && (
          <Button
            secondary
            label={
              reviewingConflict
                ? "Loading server version…"
                : serverReviewReady
                  ? "Resolve save conflict"
                  : conflictReviewError
                    ? "Retry server review"
                    : "Review server version"
            }
            disabled={reviewingConflict}
            onPress={serverReviewReady ? resolveConflict : loadServerVersion}
          />
        )}
      </View>

      {training.status === "conflict" && conflictReviewError ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {conflictReviewError}
        </Text>
      ) : null}

      <Modal
        visible={adjusting || conflictDetails}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setAdjusting(false);
          setConflictDetails(false);
        }}
      >
        <SafeAreaView
          edges={["top", "left", "right", "bottom"]}
          style={[styles.safe, { backgroundColor: colors.background }]}
        >
          <KeyboardAvoidingView
            style={styles.safe}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={styles.sheet}
              keyboardShouldPersistTaps="handled"
            >
              <View accessibilityViewIsModal style={styles.sheetContent}>
                {conflictDetails ? (
                  <ConflictDetails
                    actionError={conflictActionError}
                    onClose={() => setConflictDetails(false)}
                    onActionError={setConflictActionError}
                    onResolved={() => {
                      setConflictDetails(false);
                      setReviewedConflict(false);
                    }}
                    training={training}
                  />
                ) : (
                  <RestSettings
                    colors={colors}
                    restError={restError}
                    seconds={seconds}
                    setRestError={setRestError}
                    setSeconds={setSeconds}
                    close={() => setAdjusting(false)}
                    restart={(duration) => training.restartRest(duration)}
                  />
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {remaining !== null && (
        <View style={styles.timerRow}>
          <Text accessibilityRole="header" style={{ color: colors.text }}>
            Rest · {remaining}s
          </Text>
          <Button
            secondary
            label="Adjust rest"
            onPress={() => {
              setSeconds(String(Math.max(15, remaining)));
              setRestError("");
              setAdjusting(true);
            }}
          />
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
        </View>
      )}
      {training.timerDeadline !== null &&
      announcedDeadline === training.timerDeadline ? (
        <Text accessibilityLiveRegion="polite" style={styles.visuallyHidden}>
          Rest timer finished.
        </Text>
      ) : null}
    </View>
  );
}

type Training = ReturnType<typeof useTraining>;

function ConflictDetails({
  actionError,
  onClose,
  onActionError,
  onResolved,
  training,
}: {
  actionError: string;
  onClose: () => void;
  onActionError: (message: string) => void;
  onResolved: () => void;
  training: Training;
}) {
  const { colors } = useTheme();
  return (
    <>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}
      >
        Resolve save conflict
      </Text>
      <Text style={{ color: colors.secondary }}>
        Review the server version before applying or discarding your pending
        edits.
      </Text>
      <View style={styles.conflictActions}>
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
                    void training
                      .reapply()
                      .then(onResolved)
                      .catch(() =>
                        onActionError("Could not reapply changes. Retry."),
                      );
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
                    void training
                      .discardPending()
                      .then(onResolved)
                      .catch(() =>
                        onActionError("Could not discard changes. Retry."),
                      );
                  },
                },
              ],
            )
          }
        />
      </View>
      {actionError ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {actionError}
        </Text>
      ) : null}
      <Button secondary label="Close conflict details" onPress={onClose} />
    </>
  );
}

function RestSettings({
  colors,
  restError,
  seconds,
  setRestError,
  setSeconds,
  close,
  restart,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  restError: string;
  seconds: string;
  setRestError: (error: string) => void;
  setSeconds: (value: string) => void;
  close: () => void;
  restart: (duration: number) => Promise<void>;
}) {
  return (
    <>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}
      >
        Restart rest duration
      </Text>
      <Text style={{ color: colors.secondary }}>
        Choose a duration from 15 to 3,600 seconds.
      </Text>
      <TextInput
        accessibilityLabel="Rest duration seconds"
        accessibilityHint="Enter a whole number from 15 to 3600."
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
          void restart(Number(seconds))
            .then(() => {
              setRestError("");
              close();
            })
            .catch(() => setRestError("Could not update rest. Retry."));
        }}
      />
      <Button secondary label="Close rest settings" onPress={close} />
      {restError ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {restError}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 8,
  },
  status: { flex: 1, fontSize: 13 },
  timerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  conflictActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  safe: { flex: 1 },
  sheet: { flexGrow: 1, justifyContent: "center", padding: 24 },
  sheetContent: { gap: 16 },
  input: { minHeight: 50, borderWidth: 1, padding: 12, fontSize: 20 },
  visuallyHidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
