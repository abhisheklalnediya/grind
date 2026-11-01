import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
export type VerifiedAuthState = {
  session: Session | null;
  error: string;
  recovery: boolean;
};
export interface AuthSessionPort {
  getSession(): Promise<{ data: { session: Session | null }; error: unknown }>;
  getUser(
    token: string,
  ): Promise<{ data: { user: User | null }; error: unknown }>;
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
}
export function subscribeVerifiedSession(
  auth: AuthSessionPort,
  notify: (state: VerifiedAuthState) => void,
) {
  let active = true;
  let revision = 0;
  const publish = async (
    session: Session | null,
    recovery: boolean,
    version: number,
  ) => {
    if (!active || version !== revision) return;
    if (!session) {
      notify({ session: null, error: "", recovery: false });
      return;
    }
    try {
      const { data, error } = await auth.getUser(session.access_token);
      if (!active || version !== revision) return;
      if (
        error ||
        !data.user ||
        data.user.id !== session.user.id ||
        !data.user.email_confirmed_at
      )
        throw Error("Invalid restored session.");
      notify({ session: { ...session, user: data.user }, error: "", recovery });
    } catch {
      if (active && version === revision)
        notify({
          session: null,
          error:
            "Couldn’t verify your session. Check your connection and try again.",
          recovery: false,
        });
    }
  };
  const initialRevision = revision;
  const { data } = auth.onAuthStateChange((event, session) => {
    const version = ++revision;
    // Supabase may hold its auth lock during this callback. Validate outside it.
    queueMicrotask(() => {
      void publish(session, event === "PASSWORD_RECOVERY", version);
    });
  });
  void auth
    .getSession()
    .then((result) => {
      if (!active || revision !== initialRevision) return;
      if (result.error) throw result.error;
      void publish(result.data.session, false, ++revision);
    })
    .catch(() => {
      if (active && revision === initialRevision)
        notify({
          session: null,
          error: "Couldn’t restore your session. Retry to continue.",
          recovery: false,
        });
    });
  return () => {
    active = false;
    revision++;
    data.subscription.unsubscribe();
  };
}
