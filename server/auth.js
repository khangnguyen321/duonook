import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './database.js';

export const sessionCookieName = 'duonook_session';

export function createSessionToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    config.sessionSecret,
    { expiresIn: '14d', issuer: 'duonook' },
  );
}

export function setSessionCookie(response, token) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    path: '/',
  });
}

export async function userFromSessionToken(token) {
  const payload = jwt.verify(token, config.sessionSecret, { issuer: 'duonook' });
  const user = await db.get(
    `SELECT id, display_name AS displayName, email, avatar_color AS avatarColor
     FROM users WHERE id = ?`,
    [Number(payload.sub)],
  );
  if (!user || !config.approvedEmails.includes(user.email.toLowerCase())) {
    throw new Error('Session is no longer valid.');
  }
  return user;
}

export async function authenticate(request, response, next) {
  try {
    const token = request.cookies[sessionCookieName];
    if (!token) return response.status(401).json({ error: 'Authentication required.' });

    request.user = await userFromSessionToken(token);
    return next();
  } catch {
    return response.status(401).json({ error: 'Session is no longer valid.' });
  }
}
