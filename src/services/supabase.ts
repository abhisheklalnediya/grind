import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSecureSessionStorage } from "./secureSessionStorage";
import { readEnvironment } from "./environment";
import type { Database } from "@/types/database";
import { ensureAuthCrypto } from "./authCrypto";
let client: SupabaseClient<Database> | null = null;
export const AUTH_STORAGE_KEY = "grind.auth.session.v1";
export function getSupabase() {
  if (client) return client;
  const environment = readEnvironment();
  if (!environment)
    throw new Error(
      "Configure a local Supabase URL or the approved GRIND project URL and public publishable key before signing in.",
    );
  ensureAuthCrypto();
  const storageKey = `${AUTH_STORAGE_KEY}.${new URL(environment.url).origin.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const options = {
    keychainService: storageKey,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  const storage = createSecureSessionStorage({
    getItemAsync: (key) => SecureStore.getItemAsync(key, options),
    setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, options),
    deleteItemAsync: (key) => SecureStore.deleteItemAsync(key, options),
  });
  client = createClient<Database>(environment.url, environment.key, {
    auth: {
      storageKey,
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return client;
}
