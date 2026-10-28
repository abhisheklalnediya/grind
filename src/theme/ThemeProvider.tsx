import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "./useTheme";
import {
  appearanceColors,
  appearanceKey,
  readAppearance,
  resolveAppearance,
  type AppearancePreference,
} from "./appearance";
export interface AppearanceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
type Props = PropsWithChildren<{ scope: string; storage?: AppearanceStorage }>;
export function ThemeProvider({
  children,
  scope,
  storage = AsyncStorage,
}: Props) {
  const key = appearanceKey(scope);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const system = useColorScheme();
  const [stored, setStored] = useState<{
    key: string;
    preference: AppearancePreference;
  }>({ key: "", preference: "system" });
  const [issue, setIssue] = useState({ key: "", message: "" });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const revision = useRef(0);
  const mounted = useRef(true);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const committed = useRef(new Map<string, AppearancePreference>());
  const preference = stored.key === key ? stored.preference : "system";
  const mode = resolveAppearance(preference, system);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      invalidate();
    };
  }, [invalidate]);
  useEffect(() => {
    let active = true;
    const version = ++revision.current;
    const current = () => active && version === revision.current;
    void storage
      .getItem(key)
      .then((value) => {
        if (!current()) return;
        const preference = readAppearance(value);
        committed.current.set(key, preference);
        setStored({ key, preference });
        setIssue({ key, message: "" });
        setSavingKey(null);
      })
      .catch(() => {
        if (!current()) return;
        setStored({ key, preference: "system" });
        setIssue({
          key,
          message:
            "Couldn’t load your appearance. Following your phone theme for now.",
        });
        setSavingKey(null);
      });
    return () => {
      active = false;
      invalidate();
    };
  }, [key, storage, loadAttempt, invalidate]);
  const setPreference = useCallback(
    async (next: AppearancePreference) => {
      const version = ++revision.current;
      setSavingKey(key);
      setIssue({ key, message: "" });
      const write = writes.current.then(() => storage.setItem(key, next));
      writes.current = write.catch(() => {});
      try {
        await write;
        committed.current.set(key, next);
        if (mounted.current && version === revision.current)
          setStored({ key, preference: next });
      } catch (error) {
        if (mounted.current && version === revision.current) {
          setStored({
            key,
            preference: committed.current.get(key) ?? "system",
          });
          setIssue({
            key,
            message: "Couldn’t save your appearance. Please try again.",
          });
        }
        throw error;
      } finally {
        if (mounted.current && version === revision.current) setSavingKey(null);
      }
    },
    [key, storage],
  );
  return (
    <ThemeContext.Provider
      value={{
        scope,
        retry: () => setLoadAttempt((value) => value + 1),
        colors: appearanceColors(mode),
        mode,
        preference,
        setPreference,
        hydrating: stored.key !== key,
        saving: savingKey === key,
        error: issue.key === key ? issue.message : "",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
