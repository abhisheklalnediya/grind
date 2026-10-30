import { useEffect, type PropsWithChildren } from "react";
import { router, useSegments } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { joinGrind } from "@/services/grindAccount";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "./AuthProvider";
import { authService } from "./authService";
export function AuthGate({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const auth = useAuth();
  const segments: string[] = useSegments();
  const inAuth = segments[0] === "auth";
  const callback = inAuth && segments[1] === "callback";
  const membership = useQuery({
    queryKey: ["grind-account", auth.session?.user.id],
    queryFn: joinGrind,
    enabled: Boolean(auth.session) && !auth.recovery && !callback,
    retry: false,
  });
  const needsSignIn =
    !auth.session &&
    (!inAuth || segments[1] === "setup" || segments[1] === "new-password");
  const needsRecovery = Boolean(
    auth.session &&
      auth.recovery &&
      !(inAuth && segments[1] === "new-password"),
  );
  const needsSetup = Boolean(
    auth.session &&
      !auth.recovery &&
      membership.data &&
      !membership.data.setup_completed_at &&
      !(inAuth && segments[1] === "setup"),
  );
  const needsTrain = Boolean(
    auth.session &&
      !auth.recovery &&
      membership.data?.setup_completed_at &&
      inAuth,
  );
  useEffect(() => {
    if (auth.initializing || auth.error || callback) return;
    if (needsSignIn) router.replace("/auth/sign-in");
    else if (needsRecovery) router.replace("/auth/new-password");
    else if (auth.session && !auth.recovery && membership.data) {
      if (needsSetup) router.replace("/auth/setup");
      else if (needsTrain) router.replace("/");
    }
  }, [
    auth.initializing,
    auth.error,
    auth.session,
    auth.recovery,
    inAuth,
    callback,
    membership.data,
    needsSignIn,
    needsRecovery,
    needsSetup,
    needsTrain,
  ]);
  if (auth.error)
    return (
      <Screen>
        <Heading title="Connection setup needed" subtitle={auth.error} />
        <Button label="Retry" onPress={auth.retry} />
      </Screen>
    );
  if (
    auth.initializing ||
    (auth.session && !auth.recovery && !callback && membership.isPending)
  )
    return (
      <Screen>
        <Heading title="Opening Grind…" />
      </Screen>
    );
  if (auth.session && membership.isError && !auth.recovery && !callback)
    return (
      <Screen>
        <Heading
          title="Couldn’t open your Grind account."
          subtitle="Retry connecting to your Grind account."
        />
        <Text style={{ color: colors.secondary }}>
          Check the local backend connection and membership migration.
        </Text>
        <Button
          label="Retry"
          onPress={() => {
            void membership.refetch();
          }}
        />
        <Button
          label="Sign out of Grind"
          secondary
          onPress={() => {
            void authService.signOut().catch(auth.retry);
          }}
        />
      </Screen>
    );
  if (!callback && (needsSignIn || needsRecovery || needsSetup || needsTrain))
    return (
      <Screen>
        <Heading title="Opening Grind…" />
      </Screen>
    );
  return children;
}
