import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/services/supabase";
import { useEditorStore } from "@/state/useEditorStore";
import { getAuthError } from "./validation";
import { subscribeVerifiedSession } from "./sessionLifecycle";
type AuthState = {
  session: Session | null;
  initializing: boolean;
  error: string;
  recovery: boolean;
  finishRecovery: () => void;
  retry: () => void;
};
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [recovery, setRecovery] = useState(false);
  const query = useQueryClient();
  const userId = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    let removeAppState = () => {};
    try {
      const client = getSupabase();
      unsubscribe = subscribeVerifiedSession(client.auth, (next) => {
        if (!alive) return;
        const changedAccount =
          userId.current !== (next.session?.user.id ?? null);
        if (changedAccount) {
          query.clear();
          useEditorStore.getState().reset();
        }
        userId.current = next.session?.user.id ?? null;
        setSession(next.session);
        setError(next.error);
        setRecovery((current) =>
          next.session
            ? changedAccount
              ? next.recovery
              : current || next.recovery
            : false,
        );
        setInitializing(false);
      });
      const refresh = (state: string) => {
        if (state === "active") void client.auth.startAutoRefresh();
        else void client.auth.stopAutoRefresh();
      };
      refresh(AppState.currentState);
      const listener = AppState.addEventListener("change", refresh);
      removeAppState = () => {
        listener.remove();
        void client.auth.stopAutoRefresh();
      };
    } catch (issue) {
      queueMicrotask(() => {
        if (alive) {
          setError(getAuthError(issue));
          setInitializing(false);
        }
      });
    }
    return () => {
      alive = false;
      unsubscribe();
      removeAppState();
    };
  }, [attempt, query]);
  return (
    <Context.Provider
      value={{
        session,
        initializing,
        error,
        recovery,
        finishRecovery: () => setRecovery(false),
        retry: () => {
          setError("");
          setInitializing(true);
          setAttempt((v) => v + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}
