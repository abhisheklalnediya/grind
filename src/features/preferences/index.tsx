import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { joinGrind } from "@/services/grindAccount";
import { scopedSettings } from "@/services/scopedSettings";
import { useTheme } from "@/theme/useTheme";
type Defaults = {
  unit: "kg" | "lb";
  restSeconds: number;
  pending: boolean;
  error: string;
  retry: () => void;
};
const Context = createContext<Defaults>({
  unit: "kg",
  restSeconds: 120,
  pending: false,
  error: "",
  retry: () => {},
});
export function TrainingDefaultsProvider({
  userId,
  children,
}: PropsWithChildren<{ userId?: string }>) {
  const { scope } = useTheme();
  const port = useMemo(
    () => (userId ? scopedSettings(userId) : null),
    [userId],
  );
  const account = useQuery({
    queryKey: ["grind-account", userId],
    queryFn: joinGrind,
    enabled: false,
  });
  const ready = Boolean(account.data?.setup_completed_at);
  const settings = useQuery({
    queryKey: ["grind-settings", userId, scope],
    queryFn: () => {
      if (!port) throw new Error("Sign in first.");
      return port.load();
    },
    enabled: port !== null && ready,
    retry: false,
  });
  return (
    <Context.Provider
      value={{
        unit: settings.data?.preferred_unit ?? "kg",
        restSeconds: settings.data?.default_rest_seconds ?? 120,
        pending: port !== null && settings.isPending,
        error: settings.isError
          ? "Couldn’t load training defaults. Retry before adding exercises or sets."
          : "",
        retry: () => {
          void settings.refetch();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTrainingDefaults() {
  return useContext(Context);
}
