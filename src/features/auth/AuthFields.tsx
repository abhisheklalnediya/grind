import { useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";

type Mode = "signin" | "signup" | "recovery";

type Props = {
  mode: Mode;
  email: string;
  password: string;
  emailError: string;
  passwordError: string;
  pending: boolean;
  visible: boolean;
  onEmailChange(value: string): void;
  onPasswordChange(value: string): void;
  onSubmit(): void;
  onToggleVisibility(): void;
};

export function AuthFields({
  mode,
  email,
  password,
  emailError,
  passwordError,
  pending,
  visible,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleVisibility,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          ref={emailInput}
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType={mode === "recovery" ? "done" : "next"}
          value={email}
          onChangeText={onEmailChange}
          onSubmitEditing={() =>
            mode === "recovery" ? onSubmit() : passwordInput.current?.focus()
          }
          style={styles.input}
          editable={!pending}
        />
        {emailError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {emailError}
          </Text>
        ) : null}
      </View>
      {mode !== "recovery" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordInput}
              accessibilityLabel="Password"
              secureTextEntry={!visible}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              textContentType={mode === "signup" ? "newPassword" : "password"}
              returnKeyType="done"
              value={password}
              onChangeText={onPasswordChange}
              onSubmitEditing={onSubmit}
              style={[styles.input, styles.passwordInput]}
              editable={!pending}
            />
            <View style={styles.visibilityButton}>
              <Button
                label={visible ? "Hide" : "Show"}
                accessibilityLabel={visible ? "Hide password" : "Show password"}
                secondary
                disabled={pending}
                onPress={onToggleVisibility}
              />
            </View>
          </View>
          {mode === "signup" ? (
            <Text style={styles.helper}>
              Use 8–256 characters. Your password is not trimmed.
            </Text>
          ) : null}
          {passwordError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {passwordError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: { gap: 8 },
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
    helper: { color: colors.secondary, fontSize: 14, lineHeight: 21 },
    passwordRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
    passwordInput: { flex: 1 },
    visibilityButton: { minWidth: 72, justifyContent: "center" },
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
    error: { color: colors.error, fontSize: 16, lineHeight: 23 },
  });
