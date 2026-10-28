import { authService, AUTH_CALLBACK } from "./authService";
import { getSupabase } from "@/services/supabase";
jest.mock("@/services/supabase", () => ({ getSupabase: jest.fn() }));
it("keeps sign-out local and scopes verification/reset callbacks to Grind", async () => {
  const signOut = jest.fn(async () => ({ error: null }));
  const resetPasswordForEmail = jest.fn(async () => ({ error: null }));
  const signUp = jest.fn(async () => ({
    data: { session: null },
    error: null,
  }));
  jest
    .mocked(getSupabase)
    .mockReturnValue({
      auth: { signOut, resetPasswordForEmail, signUp },
    } as unknown as ReturnType<typeof getSupabase>);
  await authService.signOut();
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  await authService.recover("alex@example.com");
  expect(resetPasswordForEmail).toHaveBeenCalledWith("alex@example.com", {
    redirectTo: AUTH_CALLBACK,
  });
  await authService.signUp("alex@example.com", "test-password");
  expect(signUp).toHaveBeenCalledWith({
    email: "alex@example.com",
    password: "test-password",
    options: { emailRedirectTo: AUTH_CALLBACK },
  });
});

it('passes sign-in/password inputs unchanged and propagates each SDK failure', async () => {
  const issue = Error('sdk failed');
  const success = { data: { session: { id: 'fixture' } }, error: null };
  const signInWithPassword = jest.fn().mockResolvedValueOnce({ error: null }).mockResolvedValue({ error: issue });
  const updateUser = jest.fn().mockResolvedValueOnce({ error: null }).mockResolvedValue({ error: issue });
  const signUp = jest.fn().mockResolvedValueOnce(success).mockResolvedValue({ data: null, error: issue });
  const resetPasswordForEmail = jest.fn(async () => ({ error: issue }));
  const signOut = jest.fn(async () => ({ error: issue }));
  jest.mocked(getSupabase).mockReturnValue({ auth: { signInWithPassword, updateUser, signUp, resetPasswordForEmail, signOut } } as unknown as ReturnType<typeof getSupabase>);
  await authService.signIn('a@example.com', ' exact password ');
  expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: ' exact password ' });
  await authService.updatePassword(' updated password ');
  expect(updateUser).toHaveBeenCalledWith({ password: ' updated password ' });
  expect(await authService.signUp('a@example.com', 'password')).toEqual(success.data);
  await expect(authService.signIn('a@example.com', 'password')).rejects.toBe(issue);
  await expect(authService.signUp('a@example.com', 'password')).rejects.toBe(issue);
  await expect(authService.updatePassword('password')).rejects.toBe(issue);
  await expect(authService.recover('a@example.com')).rejects.toBe(issue);
  await expect(authService.signOut()).rejects.toBe(issue);
});
