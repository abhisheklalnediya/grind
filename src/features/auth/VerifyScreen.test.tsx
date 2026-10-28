import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getSupabase } from '@/services/supabase';
import { AUTH_CALLBACK } from './authService';
import { VerifyScreen } from './VerifyScreen';
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: jest.fn() }));
jest.mock('@/services/supabase', () => ({ getSupabase: jest.fn() }));
const resend = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-27T12:00:00Z'));
  jest.mocked(useLocalSearchParams).mockReturnValue({ email: 'alex@example.com' });
  jest.mocked(getSupabase).mockReturnValue({ auth: { resend } } as unknown as ReturnType<typeof getSupabase>);
});
afterEach(() => jest.useRealTimers());

it('enforces cooldown, resends only through the Grind callback and cleans its clock on exit', async () => {
  const interval = jest.spyOn(global, "setInterval");
  const clear = jest.spyOn(global, "clearInterval");
  resend.mockResolvedValue({ error: null });
  const view = await render(<VerifyScreen />);
  expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  await act(() => jest.advanceTimersByTime(60_000));
  await fireEvent.press(screen.getByRole('button', { name: 'Resend verification email' }));
  expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'alex@example.com', options: { emailRedirectTo: AUTH_CALLBACK } });
  expect(screen.getByText('If verification is still needed, a new link is on its way.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(router.replace).toHaveBeenCalledWith('/auth/sign-in');
  await view.unmount();
  const clockIndex = interval.mock.calls.findIndex((call) => call[1] === 1000);
  expect(clockIndex).toBeGreaterThanOrEqual(0);
  expect(clear).toHaveBeenCalledWith(interval.mock.results[clockIndex]?.value);
  interval.mockRestore(); clear.mockRestore();
});

it('rejects invalid email parameters without contacting Auth', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ email: 'invalid' });
  await render(<VerifyScreen />);
  await act(() => jest.advanceTimersByTime(60_000));
  await fireEvent.press(screen.getByRole('button', { name: 'Resend verification email' }));
  expect(screen.getByText('Return to create account and enter your email again.')).toBeVisible();
  expect(resend).not.toHaveBeenCalled();
});

it('keeps resend retryable after server or transport failure without exposing provider details', async () => {
  resend.mockResolvedValueOnce({ error: Error('private provider token') }).mockRejectedValueOnce(Error('transport private'));
  await render(<VerifyScreen />);
  await act(() => jest.advanceTimersByTime(60_000));
  for (let attempt = 0; attempt < 2; attempt++) {
    await fireEvent.press(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(screen.getByText('Couldn’t resend the link. Please try again later.')).toBeVisible();
    expect(screen.queryByText(/private/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeEnabled();
  }
});
