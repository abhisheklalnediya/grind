import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { getSupabase } from "@/services/supabase";
import { callbackCode } from "./authCallback";
export function CallbackScreen() {
  const url = Linking.useURL();
  const request = useRef<{ url: string; promise: Promise<void> } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!url) return;
    if (!request.current || request.current.url !== url) {
      request.current = {
        url,
        promise: (async () => {
          const code = callbackCode(url);
          const { error: issue } =
            await getSupabase().auth.exchangeCodeForSession(code);
          if (issue) throw issue;
        })(),
      };
    }
    let alive = true;
    // StrictMode replay attaches a new observer to the same one-use exchange.
    void request.current.promise
      .then(() => {
        if (alive) router.replace("/");
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <Screen>
      <Heading
        title={error ? "This link couldn’t be opened." : "Checking your link…"}
        subtitle={
          error
            ? "The link may have expired or been opened on another device. Request a new email from Grind."
            : "Your email link is being verified."
        }
      />
      {error ? (
        <Button
          label="Back to sign in"
          onPress={() => router.replace("/auth/sign-in")}
        />
      ) : null}
    </Screen>
  );
}
