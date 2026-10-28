import { Platform } from "react-native";
import { digest, getRandomValues, randomUUID } from "expo-crypto";
import { ensureAuthCrypto } from "./authCrypto";
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: jest.fn(async () => new ArrayBuffer(32)),
  getRandomValues: jest.fn((value) => value),
  randomUUID: jest.fn(),
}));
it("provides native secure randomness and S256 without replacing an available implementation", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: undefined,
  });
  try {
    ensureAuthCrypto();
    const instance = globalThis.crypto;
    instance.getRandomValues(new Uint32Array(56));
    expect(getRandomValues).toHaveBeenCalled();
    await instance.subtle.digest("SHA-256", new Uint8Array([1, 2]));
    expect(digest).toHaveBeenCalledWith("SHA-256", new Uint8Array([1, 2]));
    await expect(
      instance.subtle.digest("SHA-1", new Uint8Array()),
    ).rejects.toThrow();
    ensureAuthCrypto();
    expect(globalThis.crypto).toBe(instance);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

it('leaves browser crypto untouched and fills only missing native operations', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const os = Platform.OS;
  const secureRandom = jest.fn();
  const uuid = jest.fn();
  const digestExisting = jest.fn();
  try {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    ensureAuthCrypto();
    expect(globalThis.crypto).toBeUndefined();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    Object.defineProperty(globalThis, 'crypto', { configurable: true,
      value: { getRandomValues: secureRandom, randomUUID: uuid, subtle: { digest: digestExisting } } });
    ensureAuthCrypto();
    expect(globalThis.crypto.getRandomValues).toBe(secureRandom);
    expect(globalThis.crypto.randomUUID).toBe(uuid);
    expect(globalThis.crypto.subtle.digest).toBe(digestExisting);
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { subtle: {} } });
    ensureAuthCrypto();
    globalThis.crypto.randomUUID();
    expect(randomUUID).toHaveBeenCalled();
    await globalThis.crypto.subtle.digest({ name: 'SHA-256' }, new Uint8Array([9]));
    expect(digest).toHaveBeenLastCalledWith('SHA-256', new Uint8Array([9]));
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
