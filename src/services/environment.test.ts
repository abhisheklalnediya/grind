import { readEnvironment, validateEnvironment } from "./environment";
const key = "sb_publishable_local_test_key_only";
it("accepts loopback/emulator/LAN endpoints and rejects hosted by default", () => {
  for (const host of [
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
    "192.168.1.3",
    "172.16.0.2",
    "172.31.255.255",
  ])
    expect(validateEnvironment(`http://${host}:55421`, key)).toEqual({
      url: `http://${host}:55421`,
      key,
    });
  for (const url of [
    "https://project.supabase.co",
    "http://8.8.8.8",
    "ftp://localhost",
    "http://localhost.evil.com",
    "http://user:password@localhost",
    "http://172.32.0.1",
    "http://172.15.255.255",
  ])
    expect(validateEnvironment(url, key)).toBeNull();
});
it("rejects missing config and privileged keys without reflecting secrets", () => {
  expect(validateEnvironment(undefined, key)).toBeNull();
  expect(
    validateEnvironment(
      "http://localhost:55421",
      "sb_secret_never_allowed_here",
    ),
  ).toBeNull();
  const privileged = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
  expect(validateEnvironment("http://localhost:55421", privileged)).toBeNull();
});

it('rejects malformed encoded credentials and reads only public environment configuration', () => {
  expect(validateEnvironment('http://localhost:55421', 'header.not-valid-base64-json.signature')).toBeNull();
});

it('validates the public environment reader rather than falling back to a hosted endpoint', () => {
  const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55421';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
    expect(readEnvironment()).toEqual({ url: 'http://127.0.0.1:55421', key });
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(readEnvironment()).toBeNull();
  } finally {
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});
