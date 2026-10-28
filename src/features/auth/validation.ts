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
export function getAuthError(error: unknown) {
  // Never reflect provider details, request URLs, tokens or credentials in the UI.
  return error instanceof Error &&
    error.message.startsWith("Configure a local Supabase")
    ? error.message
    : "We couldn’t complete that request. Check your connection and details, then try again.";
}
