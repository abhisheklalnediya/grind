import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { authService } from "./authService";
import { logSignInFailure } from "./authDiagnostics";
import { AuthBrandHeader } from "./AuthBrandHeader";
import { AuthFields } from "./AuthFields";
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
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email)
    ? params.email[0]
    : params.email;
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const mounted = useRef(false);
  const submitting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async () => {
    if (submitting.current || awaitingSession) return;
    const parsedEmail = emailSchema.safeParse(email.trim());
    const parsedPassword =
      mode === "signin"
        ? signInSchema.shape.password.safeParse(password)
        : credentialsSchema.shape.password.safeParse(password);
    const nextEmailError = parsedEmail.success
      ? ""
      : "Enter a valid email address.";
    const nextPasswordError =
      mode === "recovery"
        ? ""
        : parsedPassword.success
          ? ""
          : mode === "signin"
            ? "Enter your password."
            : "Use at least 8 characters. Passwords can be up to 256 characters.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError("");
    setMessage("");
    if (
      !parsedEmail.success ||
      (mode !== "recovery" && !parsedPassword.success)
    )
      return;

    submitting.current = true;
    setPending(true);
    try {
      const address = parsedEmail.data;
      if (mode === "recovery") {
        await authService.recover(address);
        if (mounted.current)
          setMessage("If an account exists, a reset link is on its way.");
      } else if (mode === "signup") {
        const data = await authService.signUp(address, password);
        if (!mounted.current) return;
        if (data.session) setAwaitingSession(true);
        else
          setMessage(
            "You’re not signed in yet. Try signing in or request a password reset.",
          );
      } else {
        await authService.signIn(address, password);
        if (mounted.current) setAwaitingSession(true);
      }
    } catch (err) {
      if (mode === "signin") logSignInFailure(err);
      if (mounted.current) setError(getAuthError(err));
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const transferEmail = (pathname: "/auth/sign-up" | "/auth/recovery") =>
    router.push({ pathname, params: email ? { email } : {} });
  const changeEmail = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError("");
  };
  const changePassword = (value: string) => {
    setPassword(value);
    if (passwordError) setPasswordError("");
  };

  return (
    <Screen>
      <AuthBrandHeader
        title={
          mode === "signin"
            ? "Welcome back."
            : mode === "signup"
              ? "Your next chapter."
              : "Let’s get you back in."
        }
        subtitle={
          mode === "signin"
            ? "Sign in to your Grind account."
            : mode === "signup"
              ? "Create your Grind account, then complete a short setup."
              : "Reset your Grind account password."
        }
      />
      {awaitingSession ? (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          Opening your account…
        </Text>
      ) : null}
      {awaitingSession ? (
        <Button
          label="Try again"
          secondary
          onPress={() => setAwaitingSession(false)}
        />
      ) : null}
      <AuthFields
        mode={mode}
        email={email}
        password={password}
        emailError={emailError}
        passwordError={passwordError}
        pending={pending || awaitingSession}
        visible={visible}
        onEmailChange={changeEmail}
        onPasswordChange={changePassword}
        onSubmit={() => void submit()}
        onToggleVisibility={() => setVisible((current) => !current)}
      />
      {mode === "signin" ? (
        <Button
          label="Forgot password?"
          secondary
          disabled={pending || awaitingSession}
          onPress={() => transferEmail("/auth/recovery")}
        />
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
      {mode === "signup" && message ? (
        <View style={styles.actions}>
          <Button
            label="Try signing in"
            secondary
            onPress={() =>
              router.replace({ pathname: "/auth/sign-in", params: { email } })
            }
          />
          <Button
            label="Request password reset"
            secondary
            onPress={() =>
              router.replace({ pathname: "/auth/recovery", params: { email } })
            }
          />
        </View>
      ) : null}
      <Button
        label={
          pending || awaitingSession
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"
        }
        disabled={pending || awaitingSession}
        onPress={() => void submit()}
      />
      {mode === "signin" ? (
        <Button
          label="Create account"
          secondary
          disabled={pending || awaitingSession}
          onPress={() => transferEmail("/auth/sign-up")}
        />
      ) : mode !== "signup" || !message ? (
        <Button
          label="Back to sign in"
          secondary
          disabled={pending || awaitingSession}
          onPress={() =>
            router.replace({
              pathname: "/auth/sign-in",
              params: email ? { email } : {},
            })
          }
        />
      ) : null}
      {mode === "recovery" ? (
        <Text style={styles.helper}>
          We won’t tell anyone whether this email has a Grind account.
        </Text>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
    helper: { color: colors.secondary, fontSize: 14, lineHeight: 21 },
    actions: { gap: 8 },
    error: { color: colors.error, fontSize: 16, lineHeight: 23 },
  });
