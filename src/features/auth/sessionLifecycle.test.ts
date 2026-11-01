import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  subscribeVerifiedSession,
  type AuthSessionPort,
} from "./sessionLifecycle";
const user = { id: "user-a", email_confirmed_at: "2026-10-25" } as User;
const session = { access_token: "local-test", user } as Session;
function fixture() {
  let event: (type: AuthChangeEvent, value: Session | null) => void = () => {};
  const auth: AuthSessionPort = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    getUser: jest.fn(async () => ({ data: { user }, error: null })),
    onAuthStateChange: (callback) => {
      event = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    },
  };
  return {
    auth,
    emit: (type: AuthChangeEvent, value: Session | null) => event(type, value),
  };
}
const flush = async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};
it("does not expose a persisted session until server user validation completes", async () => {
  const { auth } = fixture();
  let resolve: (
    value: Awaited<ReturnType<AuthSessionPort["getUser"]>>,
  ) => void = () => {};
  auth.getUser = jest.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const notify = jest.fn();
  const stop = subscribeVerifiedSession(auth, notify);
  await flush();
  expect(notify).not.toHaveBeenCalled();
  resolve({ data: { user }, error: null });
  await flush();
  expect(notify).toHaveBeenLastCalledWith({
    session,
    error: "",
    recovery: false,
  });
  stop();
});
it("does not resurrect a session if sign-out wins a pending validation race", async () => {
  const { auth, emit } = fixture();
  let resolve: (
    value: Awaited<ReturnType<AuthSessionPort["getUser"]>>,
  ) => void = () => {};
  auth.getUser = jest.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const notify = jest.fn();
  const stop = subscribeVerifiedSession(auth, notify);
  await flush();
  emit("SIGNED_OUT", null);
  await flush();
  resolve({ data: { user }, error: null });
  await flush();
  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenLastCalledWith({
    session: null,
    error: "",
    recovery: false,
  });
  stop();
});
it("rejects unverified or mismatched user claims and validates recovery events outside callbacks", async () => {
  const { auth, emit } = fixture();
  auth.getUser = jest.fn(async () => ({
    data: { user: { ...user, id: "other" } },
    error: null,
  }));
  const notify = jest.fn();
  const stop = subscribeVerifiedSession(auth, notify);
  await flush();
  expect(notify.mock.lastCall?.[0].session).toBeNull();
  auth.getUser = jest.fn(async () => ({ data: { user }, error: null }));
  emit("PASSWORD_RECOVERY", session);
  expect(auth.getUser).not.toHaveBeenCalled();
  await flush();
  expect(notify).toHaveBeenLastCalledWith({
    session,
    error: "",
    recovery: true,
  });
  stop();
});

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

it('restores a signed-out state and reports SDK restoration errors safely', async () => {
  for (const failure of ['none', 'response', 'rejection']) {
    const { auth } = fixture();
    auth.getSession = failure === 'rejection'
      ? jest.fn(async () => { throw Error('private credentials'); })
      : jest.fn(async () => ({ data: { session: null }, error: failure === 'response' ? Error('private') : null }));
    const notify = jest.fn();
    const stop = subscribeVerifiedSession(auth, notify);
    await flush();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.lastCall?.[0].session).toBeNull();
    expect(notify.mock.lastCall?.[0].error).toBe(failure === 'none' ? '' : 'Couldn’t restore your session. Retry to continue.');
    expect(auth.getUser).not.toHaveBeenCalled();
    stop();
  }
});

it('rejects missing, unconfirmed and server-rejected identities without exposing tokens', async () => {
  const unconfirmed = { ...user }; delete unconfirmed.email_confirmed_at;
  for (const result of [
    { data: { user: null }, error: null },
    { data: { user: unconfirmed }, error: null },
    { data: { user }, error: Error('private token') },
  ]) {
    const { auth } = fixture();
    auth.getUser = jest.fn(async () => result);
    const notify = jest.fn(); const stop = subscribeVerifiedSession(auth, notify); await flush();
    expect(notify).toHaveBeenLastCalledWith({ session: null, recovery: false,
      error: 'Couldn’t verify your session. Check your connection and try again.' });
    stop();
  }
  const { auth } = fixture();
  auth.getUser = jest.fn(async () => { throw Error('transport token'); });
  const notify = jest.fn(); const stop = subscribeVerifiedSession(auth, notify); await flush();
  expect(notify.mock.lastCall?.[0].session).toBeNull();
  expect(notify.mock.lastCall?.[0].error).not.toContain('transport token'); stop();
});

it('ignores stale initial restoration and queued auth work when events or unsubscribe win', async () => {
  const { auth, emit } = fixture();
  const initial = deferred<Awaited<ReturnType<AuthSessionPort['getSession']>>>();
  auth.getSession = jest.fn(() => initial.promise);
  const notify = jest.fn(); const stop = subscribeVerifiedSession(auth, notify);
  emit('SIGNED_IN', session); emit('SIGNED_OUT', null);
  await flush();
  expect(auth.getUser).not.toHaveBeenCalled();
  initial.resolve({ data: { session }, error: null }); await flush();
  expect(notify).toHaveBeenCalledTimes(1);
  emit('SIGNED_IN', session); stop(); await flush();
  expect(auth.getUser).not.toHaveBeenCalled();
});

it('ignores late validation successes and errors after unsubscribe or a newer auth event', async () => {
  for (const end of ['stop', 'new-event', 'reject-after-stop', 'reject-after-event']) {
    const { auth, emit } = fixture();
    const verification = deferred<Awaited<ReturnType<AuthSessionPort['getUser']>>>();
    auth.getUser = jest.fn(() => verification.promise);
    const notify = jest.fn(); const stop = subscribeVerifiedSession(auth, notify); await flush();
    if (end.endsWith('event')) { emit('SIGNED_OUT', null); await flush(); } else stop();
    if (end.startsWith('reject')) verification.reject(Error('late private error'));
    else verification.resolve({ data: { user }, error: null });
    await flush();
    expect(notify.mock.calls).toEqual(end.endsWith('event') ? [[{ session: null, error: '', recovery: false }]] : []);
    stop();
  }
});

it('suppresses pending restoration errors after cleanup or an auth event', async () => {
  for (const end of ['stop', 'event']) {
    const { auth, emit } = fixture();
    const initial = deferred<Awaited<ReturnType<AuthSessionPort['getSession']>>>();
    auth.getSession = jest.fn(() => initial.promise);
    const notify = jest.fn(); const stop = subscribeVerifiedSession(auth, notify);
    if (end === 'stop') stop(); else { emit('SIGNED_OUT', null); await flush(); }
    initial.reject(Error('late restore')); await flush();
    expect(notify.mock.calls).toEqual(end === 'event' ? [[{ session: null, error: '', recovery: false }]] : []);
    stop();
  }
});
