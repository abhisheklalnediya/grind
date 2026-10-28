import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { readEnvironment } from "./environment";
import { ensureAuthCrypto } from "./authCrypto";
import { getSupabase } from "./supabase";
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
}));
jest.mock("./environment", () => ({ readEnvironment: jest.fn() }));
jest.mock("./authCrypto", () => ({ ensureAuthCrypto: jest.fn() }));
it("rejects invalid config before constructing client and uses native crypto and isolated secure storage", async () => {
  jest.mocked(readEnvironment).mockReturnValue(null);
  expect(() => getSupabase()).toThrow("Hosted connections are disabled");
  expect(createClient).not.toHaveBeenCalled();
  expect(ensureAuthCrypto).not.toHaveBeenCalled();
  jest
    .mocked(readEnvironment)
    .mockReturnValue({
      url: "http://127.0.0.1:55421",
      key: "sb_publishable_local_test_only",
    });
  const firstClient = getSupabase();
  expect(getSupabase()).toBe(firstClient);
  expect(createClient).toHaveBeenCalledTimes(1);
  const cryptoOrder = jest.mocked(ensureAuthCrypto).mock.invocationCallOrder[0];
  const clientOrder = jest.mocked(createClient).mock.invocationCallOrder[0];
  const options = jest.mocked(createClient).mock.calls[0]?.[2];
  if (cryptoOrder === undefined || clientOrder === undefined || !options?.auth?.storage) {
    throw new Error("Expected native crypto and a client with secure auth storage.");
  }
  expect(cryptoOrder).toBeLessThan(clientOrder);
  expect(options.auth?.storageKey).toBe(
    "grind.auth.session.v1.http___127.0.0.1_55421",
  );
  await options.auth.storage.setItem("test-key", "test-value");
  expect(await options.auth.storage.getItem('test-key')).toBeNull();
  await options.auth.storage.removeItem('test-key');
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith('test-key', {
    keychainService: options.auth.storageKey, keychainAccessible: 4,
  });
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key', {
    keychainService: options.auth.storageKey, keychainAccessible: 4,
  });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(String),
    { keychainService: options.auth?.storageKey, keychainAccessible: 4 },
  );
});
