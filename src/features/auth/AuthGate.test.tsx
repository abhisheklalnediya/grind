import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { router, useSegments } from "expo-router";
import { AuthGate } from "./AuthGate";
import { useAuth } from "./AuthProvider";
import { joinGrind } from "@/services/grindAccount";
import { authService } from "./authService";
jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useSegments: jest.fn(),
  Stack: () => null,
}));
jest.mock("./AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/services/grindAccount", () => ({ joinGrind: jest.fn() }));
jest.mock("./authService", () => ({ authService: { signOut: jest.fn() } }));
const base = {
  session: null,
  initializing: false,
  error: "",
  recovery: false,
  finishRecovery: jest.fn(),
  retry: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());
it("redirects a signed-out user from protected tabs without membership calls", async () => {
  jest.mocked(useAuth).mockReturnValue(base);
  jest.mocked(useSegments).mockReturnValue(["(tabs)"] as never);
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { gcTime: Infinity, retry: false } },
        })
      }
    >
      <AuthGate>
        <Text>Protected contents</Text>
      </AuthGate>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/auth/sign-in"),
  );
  expect(joinGrind).not.toHaveBeenCalled();
  expect(screen.queryByText("Protected contents")).toBeNull();
});
it("sends verified users to setup only after the server membership response", async () => {
  jest.mocked(useAuth).mockReturnValue({
    ...base,
    session: { user: { id: "test" } } as NonNullable<
      ReturnType<typeof useAuth>["session"]
    >,
  });
  jest.mocked(useSegments).mockReturnValue(["auth", "sign-in"] as never);
  jest.mocked(joinGrind).mockResolvedValue({
    user_id: "test",
    created_at: "today",
    setup_completed_at: null,
  });
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <AuthGate />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/auth/setup"),
  );
});

async function gateAt(segments: string[], value: ReturnType<typeof useAuth>) {
  jest.mocked(useSegments).mockReturnValue(segments as ReturnType<typeof useSegments>);
  jest.mocked(useAuth).mockReturnValue(value);
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } })}>
    <AuthGate><Text>Allowed page</Text></AuthGate>
  </QueryClientProvider>);
}
const signedIn = { ...base, session: { user: { id: 'user' } } as NonNullable<ReturnType<typeof useAuth>['session']> };
const account = { user_id: 'user', created_at: 'now', setup_completed_at: 'now' };

it('allows public/callback pages and completed accounts but keeps startup and error content protected', async () => {
  let view = await gateAt(['auth', 'sign-in'], base);
  expect(screen.getByText('Allowed page')).toBeVisible(); await view.unmount();
  view = await gateAt(['auth', 'callback'], signedIn);
  expect(screen.getByText('Allowed page')).toBeVisible(); await view.unmount();
  view = await gateAt(['auth', 'sign-in'], { ...base, initializing: true });
  expect(screen.queryByText('Allowed page')).toBeNull(); expect(screen.getByText('Opening Grind…')).toBeVisible();
  expect(screen.getByLabelText('GRIND Gym Logger')).toBeVisible(); await view.unmount();
  view = await gateAt(['auth', 'sign-in'], { ...base, error: 'Connection unavailable' });
  expect(screen.getByText('Connection unavailable')).toBeVisible();
  expect(screen.getByLabelText('GRIND Gym Logger')).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' })); expect(base.retry).toHaveBeenCalled(); await view.unmount();
  jest.mocked(joinGrind).mockResolvedValue(account);
  view = await gateAt(['(tabs)'], signedIn);
  await waitFor(() => expect(screen.getByText('Allowed page')).toBeVisible()); await view.unmount();
});

it('routes recovery and completed setup accounts without mounting their wrong destinations', async () => {
  let view = await gateAt(['(tabs)'], { ...signedIn, recovery: true });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/new-password'));
  expect(screen.queryByText('Allowed page')).toBeNull(); await view.unmount();
  view = await gateAt(['auth', 'new-password'], { ...signedIn, recovery: true });
  expect(screen.getByText('Allowed page')).toBeVisible(); await view.unmount();
  jest.mocked(joinGrind).mockResolvedValue(account);
  view = await gateAt(['auth', 'sign-in'], signedIn);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(screen.queryByText('Allowed page')).toBeNull(); await view.unmount();
  view = await gateAt(['auth', 'new-password'], base);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/sign-in')); await view.unmount();
  jest.mocked(joinGrind).mockResolvedValue({ ...account, setup_completed_at: null });
  view = await gateAt(['auth', 'setup'], signedIn);
  await waitFor(() => expect(screen.getByText('Allowed page')).toBeVisible()); await view.unmount();
});

it("allows a signed-in account to request password recovery, then returns to Train on exit", async () => {
  jest.mocked(joinGrind).mockResolvedValue(account);
  jest.mocked(useSegments).mockReturnValue(["auth", "recovery"] as never);
  jest.mocked(useAuth).mockReturnValue(signedIn);
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <AuthGate><Text>Allowed page</Text></AuthGate>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Allowed page")).toBeVisible());
  expect(router.replace).not.toHaveBeenCalled();
  expect(joinGrind).not.toHaveBeenCalled();

  jest.mocked(useSegments).mockReturnValue(["auth", "sign-in"] as never);
  await view.rerender(
    <QueryClientProvider client={client}>
      <AuthGate><Text>Allowed page</Text></AuthGate>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
});

it('retains membership errors behind a retry/sign-out gate instead of opening protected tabs', async () => {
  jest.mocked(joinGrind).mockRejectedValueOnce(Error('local offline')).mockResolvedValueOnce(account);
  const view = await gateAt(['(tabs)'], signedIn);
  await waitFor(() => expect(screen.getByText('Couldn’t open your Grind account.')).toBeVisible());
  expect(screen.queryByText('Allowed page')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByText('Allowed page')).toBeVisible()); await view.unmount();
  jest.mocked(joinGrind).mockRejectedValue(Error('offline'));
  jest.mocked(authService.signOut).mockRejectedValueOnce(Error('logout unavailable'));
  await gateAt(['(tabs)'], signedIn);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out of Grind' })).toBeVisible());
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out of Grind' }));
  await waitFor(() => expect(base.retry).toHaveBeenCalled());
});

it('sends a newly authenticated signup through setup and then into Train', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  jest.mocked(useSegments).mockReturnValue(['auth', 'sign-up'] as never);
  jest.mocked(useAuth).mockReturnValue(signedIn);
  jest.mocked(joinGrind).mockResolvedValue({ ...account, setup_completed_at: null });
  const view = await render(
    <QueryClientProvider client={client}><AuthGate><Text>Signed-in area</Text></AuthGate></QueryClientProvider>,
  );
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/setup'));
  expect(screen.queryByText('Signed-in area')).toBeNull();

  jest.mocked(useSegments).mockReturnValue(['auth', 'setup'] as never);
  client.setQueryData(['grind-account', 'user'], account);
  await view.rerender(
    <QueryClientProvider client={client}><AuthGate><Text>Signed-in area</Text></AuthGate></QueryClientProvider>,
  );
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(screen.queryByText('Signed-in area')).toBeNull();
});
