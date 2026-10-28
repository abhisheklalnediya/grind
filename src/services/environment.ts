import { z } from "zod";
const schema = z.object({ url: z.url(), key: z.string().min(20) });
export type PublicEnvironment = { url: string; key: string };
export function validateEnvironment(
  url: string | undefined,
  key: string | undefined,
): PublicEnvironment | null {
  const parsed = schema.safeParse({ url, key });
  if (!parsed.success || parsed.data.key.startsWith("sb_secret_")) return null;
  const address = new URL(parsed.data.url);
  const host = address.hostname.toLowerCase();
  const parts = host.split(".").map(Number);
  const privateV4 =
    parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    (parts[0] === 10 ||
      (parts[0] === 172 && Number(parts[1]) >= 16 && Number(parts[1]) <= 31) ||
      (parts[0] === 192 && parts[1] === 168));
  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    privateV4;
  if (
    !["http:", "https:"].includes(address.protocol) ||
    !local ||
    address.username ||
    address.password
  )
    return null;
  try {
    const payload = parsed.data.key.split(".")[1];
    if (
      payload &&
      JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role ===
        "service_role"
    )
      return null;
  } catch {
    return null;
  }
  return parsed.data;
}
export function readEnvironment() {
  return validateEnvironment(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
