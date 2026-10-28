import { getSupabase } from "@/services/supabase";
export const AUTH_CALLBACK = "grind://auth/callback";
export const authService = {
  async signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },
  async signUp(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_CALLBACK },
    });
    if (error) throw error;
    return data;
  },
  async recover(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_CALLBACK,
    });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await getSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
  },
  async updatePassword(password: string) {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw error;
  },
};
