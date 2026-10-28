import { getSupabase } from "./supabase";
import { joinGrind, saveSettings, loadSettings } from "./grindAccount";
jest.mock("./supabase", () => ({ getSupabase: jest.fn() }));
const id = "212ce0bd-3889-4730-8136-e067f16c1200";
it("uses only the Grind schema and exact object-returning membership/setup contracts", async () => {
  const account = {
    user_id: id,
    created_at: "2026-10-25",
    setup_completed_at: null,
  };
  const settings = {
    user_id: id,
    preferred_unit: "lb",
    default_rest_seconds: 90,
    updated_at: "2026-10-25",
  };
  const rpc = jest
    .fn()
    .mockResolvedValueOnce({ data: account, error: null })
    .mockResolvedValueOnce({ data: settings, error: null });
  const schema = jest.fn(() => ({ rpc }));
  jest
    .mocked(getSupabase)
    .mockReturnValue({ schema } as unknown as ReturnType<typeof getSupabase>);
  expect(await joinGrind()).toEqual(account);
  expect(await saveSettings("lb", 90, true)).toEqual(settings);
  expect(schema).toHaveBeenCalledWith("grind");
  expect(rpc).toHaveBeenLastCalledWith("complete_grind_setup", {
    p_preferred_unit: "lb",
    p_default_rest_seconds: 90,
  });
});
it("fails rather than claim saved on malformed or failed API responses", async () => {
  const single = jest.fn(async () => ({ data: null, error: Error("offline") }));
  const select = jest.fn(() => ({ single }));
  const from = jest.fn(() => ({ select }));
  const rpc = jest.fn(async () => ({ data: [{ user_id: id }], error: null }));
  jest
    .mocked(getSupabase)
    .mockReturnValue({ schema: () => ({ from, rpc }) } as unknown as ReturnType<
      typeof getSupabase
    >);
  await expect(loadSettings()).rejects.toThrow("offline");
  await expect(joinGrind()).rejects.toThrow();
  expect(from).toHaveBeenCalledWith("user_settings");
});

it('validates successful settings reads and uses the post-setup save contract by default', async () => {
  const settings = { user_id: id, preferred_unit: 'kg', default_rest_seconds: 120, updated_at: 'now' };
  const single = jest.fn(async () => ({ data: settings, error: null }));
  const select = jest.fn(() => ({ single }));
  const from = jest.fn(() => ({ select }));
  const rpc = jest.fn(async () => ({ data: settings, error: null }));
  jest.mocked(getSupabase).mockReturnValue({ schema: () => ({ from, rpc }) } as unknown as ReturnType<typeof getSupabase>);
  expect(await loadSettings()).toEqual(settings);
  expect(await saveSettings('kg', 120)).toEqual(settings);
  expect(rpc).toHaveBeenCalledWith('save_grind_settings', { p_preferred_unit: 'kg', p_default_rest_seconds: 120 });
  expect(select).toHaveBeenCalledWith('user_id, preferred_unit, default_rest_seconds, updated_at');
});

it('propagates membership and settings errors and rejects invalid settings payloads', async () => {
  const issue = Error('local unavailable');
  const rpc = jest.fn().mockResolvedValue({ data: null, error: issue });
  const single = jest.fn().mockResolvedValue({ data: { user_id: id, preferred_unit: 'kg', default_rest_seconds: 0, updated_at: 'now' }, error: null });
  jest.mocked(getSupabase).mockReturnValue({ schema: () => ({ rpc, from: () => ({ select: () => ({ single }) }) }) } as unknown as ReturnType<typeof getSupabase>);
  await expect(joinGrind()).rejects.toBe(issue);
  await expect(saveSettings('kg', 120)).rejects.toBe(issue);
  await expect(loadSettings()).rejects.toThrow();
  rpc.mockResolvedValueOnce({ data: null, error: null });
  await expect(saveSettings('lb', 90, true)).rejects.toThrow();
});
