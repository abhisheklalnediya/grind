const knownCodes = new Set([
  "invalid_credentials",
  "email_not_confirmed",
  "over_request_rate_limit",
  "request_timeout",
  "unexpected_failure",
  "validation_failed",
]);
const knownNames = new Set([
  "AuthApiError",
  "AuthRetryableFetchError",
  "AuthUnknownError",
  "AuthSessionMissingError",
]);

// Do not log provider messages, credentials, identifiers, URLs, or tokens.
export function logSignInFailure(error: unknown, development = __DEV__) {
  if (!development) return;
  const details = typeof error === "object" && error !== null ? error : {};
  const code =
    "code" in details &&
    typeof details.code === "string" &&
    knownCodes.has(details.code)
      ? details.code
      : "other";
  const name =
    "name" in details &&
    typeof details.name === "string" &&
    knownNames.has(details.name)
      ? details.name
      : "other";
  const status =
    "status" in details &&
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
      ? details.status
      : null;
  console.info("[GRIND auth] sign-in failed", { name, code, status });
}
