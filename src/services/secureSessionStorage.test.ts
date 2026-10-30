import {
  createSecureSessionStorage,
  type SecureStorePort,
} from "./secureSessionStorage";
function fixture() {
  const data = new Map<string, string>();
  const port: SecureStorePort = {
    getItemAsync: jest.fn(async (key) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      data.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      data.delete(key);
    }),
  };
  return { data, port, storage: createSecureSessionStorage(port) };
}
it("round-trips large unicode tokens in bounded chunks, replaces and removes only its key", async () => {
  const { data, storage } = fixture();
  const session = "😀".repeat(4000);
  data.set("another-app", "untouched");
  await storage.setItem("grind", session);
  expect(await storage.getItem("grind")).toBe(session);
  for (const [key, value] of data)
    if (key.startsWith("grind."))
      expect(new TextEncoder().encode(value).length).toBeLessThanOrEqual(2000);
  await storage.setItem("grind", "new");
  expect(await storage.getItem("grind")).toBe("new");
  expect(data.size).toBe(3);
  await storage.removeItem("grind");
  expect(await storage.getItem("grind")).toBeNull();
  expect([...data]).toEqual([["another-app", "untouched"]]);
});
it("preserves the prior session when an interrupted write cannot commit its manifest", async () => {
  const { storage, port } = fixture();
  await storage.setItem("grind", "previous");
  const write = port.setItemAsync;
  port.setItemAsync = jest.fn(async (key, value) => {
    if (key === "grind") throw Error("device full");
    await write(key, value);
  });
  await expect(storage.setItem("grind", "next")).rejects.toThrow("device full");
  expect(await storage.getItem("grind")).toBe("previous");
});
it("fails closed for corrupt or missing chunks", async () => {
  const { data, storage } = fixture();
  data.set("grind", "{broken");
  expect(await storage.getItem("grind")).toBeNull();
  data.set("grind", JSON.stringify({ generation: "valid", count: 2 }));
  data.set("grind.valid.0", "partial");
  expect(await storage.getItem("grind")).toBeNull();
});

it('rejects invalid manifest shapes and oversized sessions without publishing partial state', async () => {
  const { data, storage } = fixture();
  for (const manifest of [null, 1, {}, { generation: 'ok' }, { generation: 1, count: 1 },
    { generation: 'bad/key', count: 1 }, { generation: 'ok', count: 1.5 },
    { generation: 'ok', count: 0 }, { generation: 'ok', count: 1000 }]) {
    data.set('grind', JSON.stringify(manifest));
    expect(await storage.getItem('grind')).toBeNull();
  }
  data.delete('grind');
  await storage.removeItem('grind');
  await storage.setItem('grind', '');
  expect(await storage.getItem('grind')).toBe('');
  await expect(storage.setItem('grind', 'a'.repeat(500_000))).rejects.toThrow('too large');
  expect(await storage.getItem('grind')).toBe('');
});

it('serializes writes after failures and preserves the committed manifest when cleanup also fails', async () => {
  const { port, storage } = fixture();
  await storage.setItem('grind', 'before');
  const write = port.setItemAsync;
  port.setItemAsync = jest.fn(async (key, value) => {
    if (key === 'grind') throw Error('manifest failed');
    await write(key, value);
  });
  port.deleteItemAsync = jest.fn(async () => { throw Error('cleanup failed'); });
  await expect(storage.setItem('grind', 'interrupted')).rejects.toThrow('manifest failed');
  expect(await storage.getItem('grind')).toBe('before');
  port.setItemAsync = write;
  port.deleteItemAsync = jest.fn(async () => undefined);
  await Promise.all([storage.setItem('grind', 'second'), storage.setItem('grind', 'last')]);
  expect(await storage.getItem('grind')).toBe('last');
});
