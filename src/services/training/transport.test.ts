import { readEnvironment } from "../environment";
import { createTrainingTransport, localTrainingTransport } from "./transport";
const mockGetSession = jest.fn();
jest.mock("../supabase", () => ({
  getSupabase: () => ({ auth: { getSession: mockGetSession } }),
}));
jest.mock("../environment", () => ({ readEnvironment: jest.fn() }));
const environment = {
  url: "http://127.0.0.1:55421/",
  key: "public-local-fixture",
};
it("uses the fixed Grind schema, scoped auth and bounded catalog RPC", async () => {
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(
    async () => new Response(JSON.stringify({ saved: true }), { status: 200 }),
  );
  const port = createTrainingTransport({
    environment,
    token: async () => "local-session",
    fetch: fetcher,
  });
  await expect(port.rpc("get_active_workout", {})).resolves.toEqual({
    saved: true,
  });
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:55421/rest/v1/rpc/get_active_workout",
    expect.objectContaining({
      method: "POST",
      body: "{}",
      headers: expect.objectContaining({
        "Accept-Profile": "grind",
        "Content-Profile": "grind",
        Authorization: "Bearer local-session",
      }),
    }),
  );
  fetcher.mockResolvedValueOnce(new Response("[]"));
  await port.catalog();
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining("rpc/catalog_with_sources"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        p_after_name: null,
        p_after_id: null,
        p_limit: 100,
      }),
    }),
  );
});
it("reads bounded catalog pages and rejects repeated identities", async () => {
  const first = Array.from({ length: 100 }, (_, index) => ({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `Exercise ${index}`,
  }));
  const fetcher = jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(first)))
    .mockResolvedValueOnce(new Response("[]"));
  const port = createTrainingTransport({
    environment,
    token: async () => "local",
    fetch: fetcher,
  });
  expect(await port.catalog()).toHaveLength(100);
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
    p_after_name: first[99]?.name,
    p_after_id: first[99]?.id,
    p_limit: 100,
  });
  fetcher
    .mockResolvedValueOnce(new Response(JSON.stringify(first)))
    .mockResolvedValueOnce(new Response(JSON.stringify([first[0]])));
  await expect(port.catalog()).rejects.toMatchObject({ kind: "response" });
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{ id: "invalid", name: "Exercise" }])));
  await expect(port.catalog()).rejects.toMatchObject({ kind: "response" });
});
it("rejects catalogs exceeding the bounded pagination limit", async () => {
  let page = 0;
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      id: `10000000-0000-4000-8000-${String(++page).padStart(12, "0")}`,
      name: `Exercise ${index}`,
    }));
    return new Response(JSON.stringify(rows));
  });
  const port = createTrainingTransport({ environment, token: async () => "local", fetch: fetcher });
  await expect(port.catalog()).rejects.toMatchObject({ kind: "response" });
  expect(fetcher).toHaveBeenCalledTimes(100);
});
it("rejects missing identity without requests and sanitizes network, JSON and SQL errors", async () => {
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(
    async () => new Response("{}"),
  );
  const port = createTrainingTransport({
    environment,
    token: async () => null,
    fetch: fetcher,
  });
  await expect(port.catalog()).rejects.toMatchObject({ kind: "auth" });
  expect(fetcher).not.toHaveBeenCalled();
  const signedIn = createTrainingTransport({
    environment,
    token: async () => "local",
    fetch: fetcher,
  });
  fetcher.mockRejectedValueOnce(Error("private response"));
  await expect(signedIn.catalog()).rejects.toMatchObject({ kind: "network" });
  fetcher.mockResolvedValueOnce(new Response("not json"));
  await expect(signedIn.catalog()).rejects.toMatchObject({ kind: "response" });
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: "40001", message: "private SQL" }), {
      status: 409,
    }),
  );
  await expect(signedIn.catalog()).rejects.toMatchObject({ kind: "conflict" });
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify("invalid error body"), { status: 401 }),
  );
  await expect(signedIn.catalog()).rejects.toMatchObject({ kind: "auth" });
});
it("constructs only from local validated configuration and reads SDK tokens internally", async () => {
  jest.mocked(readEnvironment).mockReturnValue(null);
  expect(() => localTrainingTransport("user-a")).toThrow("Sign in");
  jest.mocked(readEnvironment).mockReturnValue(environment);
  const oldFetch = global.fetch;
  global.fetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(
    async () => new Response("[]"),
  );
  try {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: { access_token: "local-session", user: { id: "user-a" } },
      },
      error: null,
    });
    await expect(localTrainingTransport("user-a").catalog()).resolves.toEqual(
      [],
    );
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "other", user: { id: "user-b" } } },
      error: null,
    });
    await expect(
      localTrainingTransport("user-a").catalog(),
    ).rejects.toMatchObject({ kind: "auth" });
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    await expect(
      localTrainingTransport("user-a").catalog(),
    ).rejects.toMatchObject({
      kind: "auth",
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: Error("private"),
    });
    await expect(
      localTrainingTransport("user-a").catalog(),
    ).rejects.toMatchObject({
      kind: "auth",
    });
  } finally {
    global.fetch = oldFetch;
  }
});
