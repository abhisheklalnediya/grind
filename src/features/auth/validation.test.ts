import { credentialsSchema, emailSchema, getAuthError, signInSchema } from './validation';

it('normalizes valid emails but preserves passwords and existing shorter sign-in credentials', () => {
  expect(emailSchema.parse('Alex@Example.com')).toBe('alex@example.com');
  expect(signInSchema.parse({ email: ' Alex@Example.com ', password: '  six  ' }))
    .toEqual({ email: 'alex@example.com', password: '  six  ' });
  expect(signInSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
  expect(credentialsSchema.safeParse({ email: 'a@example.com', password: '1234567' }).success).toBe(false);
  expect(credentialsSchema.parse({ email: 'a@example.com', password: '12345678' }).password).toBe('12345678');
  expect(credentialsSchema.safeParse({ email: 'a@example.com', password: 'x'.repeat(257) }).success).toBe(false);
});

it('maps Auth failures to user actions without exposing operator setup details', () => {
  expect(getAuthError(new Error('Configure a local Supabase URL and public publishable key.')))
    .toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'email_address_not_authorized' })))
    .toBe('We couldn’t send an email right now. Check the address and try again later.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'email_provider_disabled' })))
    .toBe('Email sign-up is temporarily unavailable. Try again later.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'signup_disabled' })))
    .toBe('New account creation is temporarily unavailable. Try signing in instead.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'weak_password' })))
    .toBe('Choose a stronger password and try again.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'unknown_private_code' })))
    .toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  for (const failure of [new Error('provider token=private'), { message: 'private' }, { code: 42 }, null, undefined]) {
    expect(getAuthError(failure)).toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  }
});
