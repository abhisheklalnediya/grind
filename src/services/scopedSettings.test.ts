import { loadSettings } from "./grindAccount";
import { localTrainingTransport } from "./training/transport";
import { scopedSettings } from "./scopedSettings";
jest.mock("./grindAccount", () => ({
  ...jest.requireActual("./grindAccount"),
  loadSettings: jest.fn(),
}));
jest.mock("./training/transport", () => ({
  localTrainingTransport: jest.fn(),
}));
it("validates read ownership and uses account-bound token transport for writes", async () => {
  const row = {
    user_id: "10000000-0000-4000-8000-000000000001",
    preferred_unit: "kg",
    default_rest_seconds: 120,
    updated_at: "now",
  };
  jest
    .mocked(loadSettings)
    .mockResolvedValue(row as Awaited<ReturnType<typeof loadSettings>>);
  const rpc = jest.fn().mockResolvedValue(row);
  jest
    .mocked(localTrainingTransport)
    .mockReturnValue({ rpc, catalog: jest.fn() });
  await expect(scopedSettings(row.user_id).load()).resolves.toEqual(row);
  await expect(scopedSettings("other").load()).rejects.toMatchObject({
    kind: "auth",
  });
  await expect(scopedSettings(row.user_id).save("lb", 90)).resolves.toEqual(
    row,
  );
  rpc.mockResolvedValueOnce({
    ...row,
    user_id: "10000000-0000-4000-8000-000000000002",
  });
  await expect(
    scopedSettings(row.user_id).save("kg", 120),
  ).rejects.toMatchObject({
    kind: "auth",
  });
  expect(localTrainingTransport).toHaveBeenCalledWith(row.user_id);
  expect(rpc).toHaveBeenCalledWith("save_grind_settings", {
    p_preferred_unit: "lb",
    p_default_rest_seconds: 90,
  });
});
