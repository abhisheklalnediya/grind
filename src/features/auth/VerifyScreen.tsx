import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/tokens";
import { getSupabase } from "@/services/supabase";
import { AUTH_CALLBACK } from "./authService";
import { emailSchema } from "./validation";
export function VerifyScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ email?: string }>();
  const [until, setUntil] = useState(() => Date.now() + 60_000);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const resend = async () => {
    const email = emailSchema.safeParse(params.email);
    if (!email.success) {
      setMessage("Return to create account and enter your email again.");
      return;
    }
    setPending(true);
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email: email.data,
        options: { emailRedirectTo: AUTH_CALLBACK },
      });
      if (error) throw error;
      setMessage("If verification is still needed, a new link is on its way.");
      setUntil(Date.now() + 60_000);
    } catch {
      setMessage("Couldn’t resend the link. Please try again later.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen>
      <Heading
        title="Check your inbox."
        subtitle="Open the verification link on this device. Return to sign in if the link has expired."
      />
      <Text style={styles.label}>{params.email}</Text>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {message}
        </Text>
      ) : null}
      <Button
        label={
          remaining ? `Resend in ${remaining}s` : "Resend verification email"
        }
        disabled={remaining > 0 || pending}
        onPress={() => {
          void resend();
        }}
      />
      <Button
        label="Back to sign in"
        secondary
        onPress={() => router.replace("/auth/sign-in")}
      />
    </Screen>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { color: colors.secondary, fontSize: 16, lineHeight: 24 },
  });
