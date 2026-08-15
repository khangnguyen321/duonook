import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Server } from 'socket.io';
import {
  authenticate,
  clearSessionCookie,
  createSessionToken,
  sessionCookieName,
  setSessionCookie,
  userFromSessionToken,
} from './auth.js';
import { config } from './config.js';
import { db, initializeDatabase } from './database.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigin, credentials: true },
});
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const allowedReactions = new Set(['❤️', '👍', '😂', '😮', '😢', '🎉']);
const onlineSockets = new Map();

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [];
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      try {
        return [[key, decodeURIComponent(value)]];
      } catch {
        return [];
      }
    }),
  );
}

function toIsoTimestamp(value) {
  if (!value || value.includes('T')) return value;
  return `${value.replace(' ', 'T')}Z`;
}

async function conversationForUser(userId) {
  return db.get(
    `SELECT c.id, c.name, cm.last_read_message_id AS lastReadMessageId
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = ?
     LIMIT 1`,
    [userId],
  );
}

async function messageById(messageId, conversationId) {
  const message = await db.get(
    `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId,
            m.body, m.created_at AS createdAt, m.edited_at AS editedAt,
            m.deleted_at AS deletedAt, u.display_name AS senderName,
            u.avatar_color AS senderAvatarColor
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.id = ? AND m.conversation_id = ?`,
    [messageId, conversationId],
  );
  if (!message) return null;
  const reactions = await db.all(
    `SELECT mr.user_id AS userId, mr.emoji, u.display_name AS displayName
     FROM message_reactions mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.message_id = ?
     ORDER BY mr.created_at, mr.user_id`,
    [messageId],
  );
  return {
    ...message,
    body: message.deletedAt ? null : message.body,
    createdAt: toIsoTimestamp(message.createdAt),
    editedAt: toIsoTimestamp(message.editedAt),
    deletedAt: toIsoTimestamp(message.deletedAt),
    reactions,
  };
}

function roomName(conversationId) {
  return `conversation:${conversationId}`;
}

function normalizeMessageBody(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: config.isProduction ? undefined : false }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes.' },
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/auth/login', loginLimiter, async (request, response) => {
  const email = String(request.body.email ?? '').trim().toLowerCase();
  const password = String(request.body.password ?? '');
  const user = config.approvedEmails.includes(email)
    ? await db.get('SELECT * FROM users WHERE email = ?', [email])
    : null;
  const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!validPassword) {
    return response.status(401).json({ error: 'That email and password do not match.' });
  }

  const token = createSessionToken(user);
  setSessionCookie(response, token);
  return response.json({
    user: {
      id: user.id,
      displayName: user.display_name,
      email: user.email,
      avatarColor: user.avatar_color,
    },
  });
});

app.post('/api/auth/logout', (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

app.get('/api/auth/me', authenticate, (request, response) => {
  response.json({ user: request.user });
});

app.get('/api/conversation', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const members = await db.all(
    `SELECT u.id, u.display_name AS displayName, u.avatar_color AS avatarColor,
            u.last_seen_at AS lastSeenAt, cm.last_read_message_id AS lastReadMessageId
     FROM users u
     JOIN conversation_members cm ON cm.user_id = u.id
     WHERE cm.conversation_id = ?
     ORDER BY u.id`,
    [conversation.id],
  );
  return response.json({ conversation: { ...conversation, members } });
});

app.get('/api/messages', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const rows = await db.all(
    `SELECT id FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
    [conversation.id],
  );
  const messages = await Promise.all(
    rows.reverse().map((row) => messageById(row.id, conversation.id)),
  );
  return response.json({ messages });
});

app.post('/api/messages', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const body = normalizeMessageBody(request.body.body);
  if (!body) return response.status(400).json({ error: 'Write a message before sending.' });
  if (body.length > 2000) {
    return response.status(400).json({ error: 'Messages can be at most 2,000 characters.' });
  }
  const createdAt = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO messages (conversation_id, sender_id, body, created_at)
     VALUES (?, ?, ?, ?)`,
    [conversation.id, request.user.id, body, createdAt],
  );
  const message = await messageById(result.id, conversation.id);
  io.to(roomName(conversation.id)).emit('message:new', message);
  return response.status(201).json({ message });
});

app.patch('/api/messages/:messageId', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const messageId = Number(request.params.messageId);
  const existing = Number.isInteger(messageId)
    ? await messageById(messageId, conversation.id)
    : null;
  if (!existing) return response.status(404).json({ error: 'Message not found.' });
  if (existing.senderId !== request.user.id) {
    return response.status(403).json({ error: 'You can edit only your own messages.' });
  }
  if (existing.deletedAt) {
    return response.status(409).json({ error: 'Deleted messages cannot be edited.' });
  }
  const body = normalizeMessageBody(request.body.body);
  if (!body) return response.status(400).json({ error: 'A message cannot be empty.' });
  if (body.length > 2000) {
    return response.status(400).json({ error: 'Messages can be at most 2,000 characters.' });
  }
  const editedAt = new Date().toISOString();
  await db.run('UPDATE messages SET body = ?, edited_at = ? WHERE id = ?', [body, editedAt, messageId]);
  const message = await messageById(messageId, conversation.id);
  io.to(roomName(conversation.id)).emit('message:updated', message);
  return response.json({ message });
});

app.delete('/api/messages/:messageId', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const messageId = Number(request.params.messageId);
  const existing = Number.isInteger(messageId)
    ? await messageById(messageId, conversation.id)
    : null;
  if (!existing) return response.status(404).json({ error: 'Message not found.' });
  if (existing.senderId !== request.user.id) {
    return response.status(403).json({ error: 'You can delete only your own messages.' });
  }
  if (!existing.deletedAt) {
    await db.run(
      'UPDATE messages SET body = ?, deleted_at = ? WHERE id = ?',
      ['', new Date().toISOString(), messageId],
    );
    await db.run('DELETE FROM message_reactions WHERE message_id = ?', [messageId]);
  }
  const message = await messageById(messageId, conversation.id);
  io.to(roomName(conversation.id)).emit('message:deleted', message);
  return response.json({ message });
});

app.post('/api/messages/:messageId/reactions', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const messageId = Number(request.params.messageId);
  const message = Number.isInteger(messageId)
    ? await messageById(messageId, conversation.id)
    : null;
  if (!message) return response.status(404).json({ error: 'Message not found.' });
  if (message.deletedAt) {
    return response.status(409).json({ error: 'Deleted messages cannot have reactions.' });
  }
  const emoji = String(request.body.emoji ?? '');
  if (!allowedReactions.has(emoji)) {
    return response.status(400).json({ error: 'That reaction is not available.' });
  }
  const existing = await db.get(
    'SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [messageId, request.user.id, emoji],
  );
  if (existing) {
    await db.run(
      'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, request.user.id, emoji],
    );
  } else {
    await db.run(
      `INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
       VALUES (?, ?, ?, ?)`,
      [messageId, request.user.id, emoji, new Date().toISOString()],
    );
  }
  const updatedMessage = await messageById(messageId, conversation.id);
  io.to(roomName(conversation.id)).emit('message:reaction', updatedMessage);
  return response.json({ message: updatedMessage });
});

app.post('/api/conversation/read', authenticate, async (request, response) => {
  const conversation = await conversationForUser(request.user.id);
  if (!conversation) {
    return response.status(403).json({ error: 'You do not have access to a conversation.' });
  }
  const messageId = Number(request.body.messageId);
  const message = Number.isInteger(messageId)
    ? await messageById(messageId, conversation.id)
    : null;
  if (!message) return response.status(400).json({ error: 'Read state requires a valid message.' });
  await db.run(
    `UPDATE conversation_members SET last_read_message_id = ?
     WHERE conversation_id = ? AND user_id = ?
       AND COALESCE(last_read_message_id, 0) < ?`,
    [messageId, conversation.id, request.user.id, messageId],
  );
  const membership = await db.get(
    `SELECT last_read_message_id AS lastReadMessageId
     FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
    [conversation.id, request.user.id],
  );
  const readState = { userId: request.user.id, messageId: membership.lastReadMessageId };
  io.to(roomName(conversation.id)).emit('conversation:read', readState);
  return response.json({ readState });
});

io.use(async (socket, next) => {
  try {
    const token = parseCookies(socket.request.headers.cookie)[sessionCookieName];
    if (!token) return next(new Error('Authentication required.'));
    const user = await userFromSessionToken(token);
    const conversation = await conversationForUser(user.id);
    if (!conversation) return next(new Error('Conversation access required.'));
    socket.data.user = user;
    socket.data.conversation = conversation;
    return next();
  } catch {
    return next(new Error('Authentication required.'));
  }
});

io.on('connection', async (socket) => {
  const { user, conversation } = socket.data;
  const room = roomName(conversation.id);
  socket.join(room);

  const userSockets = onlineSockets.get(user.id) ?? new Set();
  userSockets.add(socket.id);
  onlineSockets.set(user.id, userSockets);

  const members = await db.all(
    `SELECT u.id, u.last_seen_at AS lastSeenAt
     FROM users u
     JOIN conversation_members cm ON cm.user_id = u.id
     WHERE cm.conversation_id = ?`,
    [conversation.id],
  );
  socket.emit('presence:snapshot', members.map((member) => ({
    userId: member.id,
    online: (onlineSockets.get(member.id)?.size ?? 0) > 0,
    lastSeenAt: toIsoTimestamp(member.lastSeenAt),
  })));
  io.to(room).emit('presence:update', { userId: user.id, online: true, lastSeenAt: null });

  socket.on('typing:update', (payload) => {
    socket.to(room).emit('typing:update', {
      userId: user.id,
      typing: Boolean(payload?.typing),
    });
  });

  socket.on('disconnect', async () => {
    const remainingSockets = onlineSockets.get(user.id);
    remainingSockets?.delete(socket.id);
    if (remainingSockets?.size) return;
    onlineSockets.delete(user.id);
    const lastSeenAt = new Date().toISOString();
    await db.run('UPDATE users SET last_seen_at = ? WHERE id = ?', [lastSeenAt, user.id]);
    io.to(room).emit('presence:update', { userId: user.id, online: false, lastSeenAt });
  });
});

if (config.isProduction) {
  const clientPath = path.resolve(currentDirectory, '../dist');
  app.use(express.static(clientPath));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(clientPath, 'index.html')));
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong inside the nook.' });
});

await initializeDatabase();
server.listen(config.port, () => {
  console.log(`DuoNook server listening on http://localhost:${config.port}`);
});
