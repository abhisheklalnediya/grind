import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { authService } from "./authService";
import {
  credentialsSchema,
  emailSchema,
  getAuthError,
  signInSchema,
} from "./validation";
type Mode = "signin" | "signup" | "recovery";
export function AuthScreen({ mode }: { mode: Mode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    const parsed =
      mode === "recovery"
        ? emailSchema.safeParse(email.trim())
        : (mode === "signin" ? signInSchema : credentialsSchema).safeParse({
            email,
            password,
          });
    if (!parsed.success) {
      setError(
        mode === "recovery"
          ? "Enter a valid email address."
          : mode === "signin"
            ? "Enter a valid email and your password."
            : "Enter a valid email and a password with at least 8 characters.",
      );
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      const address = email.trim().toLowerCase();
      if (mode === "recovery") {
        await authService.recover(address);
        setMessage("If an account exists, a reset link is on its way.");
      } else if (mode === "signup") {
        const data = await authService.signUp(address, password);
        if (data.session) router.replace("/");
        else
          router.push({ pathname: "/auth/verify", params: { email: address } });
      } else {
        await authService.signIn(address, password);
        router.replace("/");
      }
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Heading
        title={
          mode === "signin"
            ? "Welcome back."
            : mode === "signup"
              ? "Your next chapter."
              : "Let’s get you back in."
        }
        subtitle="Your sign-in is shared with BabyBoo. Your Grind setup is separate."
      />
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!pending}
        />
      </View>
      {mode !== "recovery" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            secureTextEntry={!visible}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            editable={!pending}
          />
          <Button
            label={visible ? "Hide password" : "Show password"}
            secondary
            onPress={() => setVisible(!visible)}
          />
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {message}
        </Text>
      ) : null}
      <Button
        label={
          pending
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"
        }
        disabled={pending}
        onPress={() => {
          void submit();
        }}
      />
      {mode === "signin" ? (
        <>
          <Button
            label="Create account"
            secondary
            onPress={() => router.push("/auth/sign-up")}
          />
          <Button
            label="Forgot password?"
            secondary
            onPress={() => router.push("/auth/recovery")}
          />
        </>
      ) : (
        <Button
          label="Back to sign in"
          secondary
          onPress={() => router.replace("/auth/sign-in")}
        />
      )}
      {mode === "recovery" ? (
        <Text style={styles.label}>
          Changing your password affects both Grind and BabyBoo.
        </Text>
      ) : null}
    </Screen>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: { gap: 8 },
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
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
