import { z } from "zod";
export const emailSchema = z
  .email()
  .transform((value) => value.trim().toLowerCase());
export const signInSchema = z.object({
  email: z.string().trim().pipe(emailSchema),
  password: z.string().min(1).max(256),
});
export const credentialsSchema = z.object({
  email: z.string().trim().pipe(emailSchema),
  password: z.string().min(8, "Use at least 8 characters.").max(256),
});
const authErrorMessages: Record<string, string> = {
  email_address_not_authorized:
    "We couldn’t send an email right now. Check the address and try again later.",
  email_address_invalid: "Enter a valid email address.",
  email_provider_disabled:
    "Email sign-up is temporarily unavailable. Try again later.",
  signup_disabled:
    "New account creation is temporarily unavailable. Try signing in instead.",
  over_email_send_rate_limit:
    "Too many verification emails were requested. Wait a while, then try again.",
  over_request_rate_limit:
    "Too many requests were made. Wait a few minutes, then try again.",
  weak_password:
    "Choose a stronger password and try again.",
  email_exists:
    "We couldn’t create that account. Try signing in or request a password reset.",
  user_already_exists:
    "We couldn’t create that account. Try signing in or request a password reset.",
};
export function getAuthError(error: unknown) {
  // Never reflect provider details, request URLs, tokens or credentials in the UI.
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (typeof code === "string") {
      const message = authErrorMessages[code];
      if (message) return message;
    }
  }
  return "We couldn’t complete that request. Check your connection and details, then try again.";
}
