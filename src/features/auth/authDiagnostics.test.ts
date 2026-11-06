import { logSignInFailure } from "./authDiagnostics";

it("logs only allowlisted diagnostic categories and HTTP status in development", () => {
  const log = jest.spyOn(console, "info").mockImplementation(() => {});
  logSignInFailure(
    {
      name: "AuthApiError",
      code: "invalid_credentials",
      status: 400,
      message: "private",
      email: "private",
    },
    true,
  );
  expect(log).toHaveBeenCalledWith("[GRIND auth] sign-in failed", {
    name: "AuthApiError",
    code: "invalid_credentials",
    status: 400,
  });
  logSignInFailure({ name: "private", code: "private", status: 999 }, true);
  expect(log).toHaveBeenLastCalledWith("[GRIND auth] sign-in failed", {
    name: "other",
    code: "other",
    status: null,
  });
  logSignInFailure(null, true);
  expect(log).toHaveBeenLastCalledWith("[GRIND auth] sign-in failed", {
    name: "other",
    code: "other",
    status: null,
  });
  logSignInFailure({ code: "invalid_credentials" }, false);
  expect(log).toHaveBeenCalledTimes(3);
  log.mockRestore();
});
