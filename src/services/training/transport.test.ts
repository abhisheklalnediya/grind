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
it("uses the fixed Grind schema, scoped auth and JSON RPC; catalog is GET without a body", async () => {
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
  await port.catalog();
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining("archived_at=is.null"),
    expect.objectContaining({ method: "GET" }),
  );
  expect(fetcher.mock.lastCall?.[1]).not.toHaveProperty("body");
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
