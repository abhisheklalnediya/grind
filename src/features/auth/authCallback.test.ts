import { callbackCode } from "./authCallback";
it("only accepts a single PKCE code at the exact Grind callback", () => {
  expect(callbackCode("grind://auth/callback?code=abc")).toBe("abc");
  for (const url of [
    "other-app://auth/callback?code=abc",
    "grind://evil/callback?code=abc",
    "grind://auth/callback",
    "grind://auth/callback?code=a&code=b",
    "grind://auth/callback#error=token",
    "grind://auth/callback?error=expired&code=a",
    "https://auth/callback?code=a",
  ])
    expect(() => callbackCode(url)).toThrow();
});
