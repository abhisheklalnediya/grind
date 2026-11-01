import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput } from "react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { AuthBrandHeader } from "./AuthBrandHeader";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { authService } from "./authService";
import { useAuth } from "./AuthProvider";
export function NewPasswordScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (password.length < 8 || password !== confirm) {
      setError("Use at least 8 characters and matching passwords.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await authService.updatePassword(password);
      auth.finishRecovery();
      router.replace("/");
    } catch {
      setError(
        "Couldn’t update the password. Request a fresh recovery link and try again.",
      );
    } finally {
      setPending(false);
    }
  };
  if (!auth.session || !auth.recovery)
    return (
      <Screen>
        <AuthBrandHeader title="Open a recovery link first." />
        <Button
          label="Request reset link"
          onPress={() => router.replace("/auth/recovery")}
        />
      </Screen>
    );
  return (
    <Screen>
      <AuthBrandHeader
        title="Choose a new password."
        subtitle="Choose a new password for your Grind account."
      />
      <Text style={styles.label}>New password</Text>
      <TextInput
        accessibilityLabel="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        style={styles.input}
        editable={!pending}
      />
      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        accessibilityLabel="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        style={styles.input}
        editable={!pending}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={pending ? "Saving…" : "Save new password"}
        disabled={pending}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { color: colors.secondary, fontSize: 16 },
    input: {
      minHeight: 52,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      color: colors.text,
      fontSize: 16,
    },
    error: { color: colors.error, fontSize: 16 },
  });
