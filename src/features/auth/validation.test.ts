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

it('shows approved Supabase configuration feedback and sanitizes arbitrary failures', () => {
  const message = 'Configure a local Supabase URL or the approved GRIND project URL and public publishable key before signing in.';
  expect(getAuthError(new Error(message))).toBe(message);
  const standaloneMessage = 'Configure a hosted GRIND Supabase URL and public publishable key before signing in.';
  expect(getAuthError(new Error(standaloneMessage))).toBe(standaloneMessage);
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'email_address_not_authorized' })))
    .toContain('Configure SMTP for the GRIND Supabase project');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'signup_disabled' })))
    .toBe('New account creation is disabled for the GRIND project.');
  expect(getAuthError(Object.assign(Error('private provider detail'), { code: 'unknown_private_code' })))
    .toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  for (const failure of [new Error('provider token=private'), { message: 'private' }, { code: 42 }, null, undefined]) {
    expect(getAuthError(failure)).toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  }
});
