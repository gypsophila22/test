process.env.NODE_ENV = 'test';

process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/db';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'dummy';
