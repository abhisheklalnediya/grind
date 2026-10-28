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

it('only exposes approved local configuration feedback and sanitizes arbitrary failures', () => {
  const message = 'Configure a local Supabase URL before signing in.';
  expect(getAuthError(new Error(message))).toBe(message);
  for (const failure of [new Error('provider token=private'), { message: 'private' }, null, undefined]) {
    expect(getAuthError(failure)).toBe('We couldn’t complete that request. Check your connection and details, then try again.');
  }
});
