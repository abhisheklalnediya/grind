export function callbackCode(url: string): string {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "grind:" ||
    parsed.hostname !== "auth" ||
    parsed.pathname !== "/callback" ||
    parsed.hash ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.searchParams.has("error")
  )
    throw new Error("Invalid callback.");
  const codes = parsed.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048)
    throw new Error("Missing callback code.");
  return codes[0];
}
