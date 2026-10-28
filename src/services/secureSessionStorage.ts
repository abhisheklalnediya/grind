export interface SecureStorePort {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
type Manifest = { generation: string; count: number };
function parse(value: string | null): Manifest | null {
  if (!value) return null;
  try {
    const m: unknown = JSON.parse(value);
    if (
      typeof m === "object" &&
      m !== null &&
      "generation" in m &&
      "count" in m &&
      typeof m.generation === "string" &&
      /^[a-z0-9]+$/.test(m.generation) &&
      Number.isInteger(m.count) &&
      Number(m.count) > 0 &&
      Number(m.count) < 1000
    )
      return m as Manifest;
  } catch {
    /* Corrupt or legacy values fail closed. */
  }
  return null;
}
// Each chunk is <= 500 UTF-16 code units (at most 2000 UTF-8 bytes).
// Commit the manifest last so interrupted writes never replace a valid session.
export function createSecureSessionStorage(store: SecureStorePort) {
  let pending: Promise<unknown> = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    const result = pending.then(fn);
    pending = result.catch(() => undefined);
    return result;
  };
  const chunkKey = (key: string, m: Manifest, i: number) =>
    `${key}.${m.generation}.${i}`;
  const removeChunks = async (key: string, m: Manifest | null) => {
    if (m)
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          store.deleteItemAsync(chunkKey(key, m, i)),
        ),
      );
  };
  return {
    getItem: (key: string) =>
      serialize(async () => {
        const manifest = parse(await store.getItemAsync(key));
        if (!manifest) return null;
        const chunks = await Promise.all(
          Array.from({ length: manifest.count }, (_, i) =>
            store.getItemAsync(chunkKey(key, manifest, i)),
          ),
        );
        return chunks.some((value) => value === null) ? null : chunks.join("");
      }),
    setItem: (key: string, value: string) =>
      serialize(async () => {
        const previous = parse(await store.getItemAsync(key));
        const points = Array.from(value);
        const next = {
          generation: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
          count: Math.max(1, Math.ceil(points.length / 500)),
        };
        if (next.count >= 1000)
          throw new Error("Session is too large for secure storage.");
        try {
          for (let i = 0; i < next.count; i++)
            await store.setItemAsync(
              chunkKey(key, next, i),
              points.slice(i * 500, (i + 1) * 500).join(""),
            );
          await store.setItemAsync(key, JSON.stringify(next));
        } catch (error) {
          await removeChunks(key, next).catch(() => undefined);
          throw error;
        }
        await removeChunks(key, previous);
      }),
    removeItem: (key: string) =>
      serialize(async () => {
        const previous = parse(await store.getItemAsync(key));
        await store.deleteItemAsync(key);
        await removeChunks(key, previous);
      }),
  };
}
