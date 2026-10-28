import { StrictMode } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { CallbackScreen } from "./CallbackScreen";
import { getSupabase } from "@/services/supabase";
jest.mock("expo-linking", () => ({ useURL: jest.fn() }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("@/services/supabase", () => ({ getSupabase: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
it("exchanges a one-use PKCE code once and navigates after StrictMode effect replay", async () => {
  jest
    .mocked(Linking.useURL)
    .mockReturnValue("grind://auth/callback?code=one-use");
  const exchangeCodeForSession = jest.fn(async () => ({ error: null }));
  jest
    .mocked(getSupabase)
    .mockReturnValue({
      auth: { exchangeCodeForSession },
    } as unknown as ReturnType<typeof getSupabase>);
  await render(
    <StrictMode>
      <CallbackScreen />
    </StrictMode>,
  );
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
});
it("shows invalid/expired-link recovery without echoing codes", async () => {
  jest
    .mocked(Linking.useURL)
    .mockReturnValue("grind://auth/callback?error=expired");
  await render(<CallbackScreen />);
  await waitFor(() =>
    expect(screen.getByText("This link couldn’t be opened.")).toBeVisible(),
  );
  expect(getSupabase).not.toHaveBeenCalled();
});

it('waits for an incoming URL and suppresses navigation after unmount', async () => {
  jest.mocked(Linking.useURL).mockReturnValue(null);
  const view = await render(<CallbackScreen />);
  expect(screen.getByText('Checking your link…')).toBeVisible();
  expect(getSupabase).not.toHaveBeenCalled();
  let finish: (value: { error: null }) => void = () => {};
  const exchangeCodeForSession = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  jest.mocked(getSupabase).mockReturnValue({ auth: { exchangeCodeForSession } } as unknown as ReturnType<typeof getSupabase>);
  jest.mocked(Linking.useURL).mockReturnValue('grind://auth/callback?code=one-use');
  await view.rerender(<CallbackScreen />);
  await view.unmount(); finish({ error: null });
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(router.replace).not.toHaveBeenCalled();
});

it('handles SDK exchange rejection and offers a safe route to sign-in', async () => {
  jest.mocked(Linking.useURL).mockReturnValue('grind://auth/callback?code=private');
  jest.mocked(getSupabase).mockReturnValue({ auth: { exchangeCodeForSession: jest.fn(async () => ({ error: Error('private') })) } } as unknown as ReturnType<typeof getSupabase>);
  await render(<CallbackScreen />);
  await waitFor(() => expect(screen.getByText('This link couldn’t be opened.')).toBeVisible());
  await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(router.replace).toHaveBeenCalledWith('/auth/sign-in');
});
