import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const users = [
  {
    displayName: process.env.DUONOOK_USER_ONE_NAME ?? 'Alex',
    email: (process.env.DUONOOK_USER_ONE_EMAIL ?? 'alex@duonook.local').trim().toLowerCase(),
    password: process.env.DUONOOK_USER_ONE_PASSWORD ?? 'nook-one',
  },
  {
    displayName: process.env.DUONOOK_USER_TWO_NAME ?? 'Sam',
    email: (process.env.DUONOOK_USER_TWO_EMAIL ?? 'sam@duonook.local').trim().toLowerCase(),
    password: process.env.DUONOOK_USER_TWO_PASSWORD ?? 'nook-two',
  },
];

if (new Set(users.map((user) => user.email)).size !== 2) {
  throw new Error('The two DuoNook accounts must use different email addresses.');
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  sessionSecret:
    process.env.SESSION_SECRET ??
    (isProduction ? '' : 'duonook-local-development-secret-change-me'),
  isProduction,
  databasePath: process.env.DATABASE_PATH ?? 'data/duonook.db',
  users,
  approvedEmails: users.map((user) => user.email),
};

if (!config.sessionSecret) {
  throw new Error('SESSION_SECRET is required in production.');
}

if (
  isProduction &&
  (!process.env.DUONOOK_USER_ONE_EMAIL ||
    !process.env.DUONOOK_USER_ONE_PASSWORD ||
    !process.env.DUONOOK_USER_TWO_EMAIL ||
    !process.env.DUONOOK_USER_TWO_PASSWORD)
) {
  throw new Error('Both private account emails and passwords are required in production.');
}
