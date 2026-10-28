import { Platform } from "react-native";
import {
  CryptoDigestAlgorithm,
  digest,
  getRandomValues,
  randomUUID,
} from "expo-crypto";
// Bridge the exact Web Crypto operations required by Supabase PKCE on Hermes.
// This is not a general SubtleCrypto implementation or local JWT verifier.
export function ensureAuthCrypto() {
  if (Platform.OS === "web") return;
  if (typeof globalThis.crypto === "undefined")
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {},
    });
  const crypto = globalThis.crypto;
  if (typeof crypto.getRandomValues !== "function")
    Object.defineProperty(crypto, "getRandomValues", {
      configurable: true,
      value: getRandomValues,
    });
  if (typeof crypto.randomUUID !== "function")
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: randomUUID,
    });
  if (typeof crypto.subtle === "undefined")
    Object.defineProperty(crypto, "subtle", { configurable: true, value: {} });
  if (typeof crypto.subtle.digest !== "function")
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        const name = typeof algorithm === "string" ? algorithm : algorithm.name;
        if (name.toUpperCase() !== "SHA-256")
          throw Error("Only SHA-256 is supported for auth.");
        return digest(CryptoDigestAlgorithm.SHA256, data);
      },
    });
}
