import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { config } from './config.js';

let database;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

export async function initializeDatabase() {
  const resolvedPath = path.resolve(config.databasePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  database = new sqlite3.Database(resolvedPath);

  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA journal_mode = WAL');
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_message_id INTEGER,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      edited_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE INDEX IF NOT EXISTS messages_conversation_created
    ON messages (conversation_id, created_at, id)
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id, emoji),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await seedPrivateNook();
}

async function seedPrivateNook() {
  const colors = ['#315c4d', '#c56f4b'];

  await run('BEGIN IMMEDIATE');
  try {
    for (const [index, configuredUser] of config.users.entries()) {
      const existingUser = await get('SELECT * FROM users WHERE email = ?', [configuredUser.email]);
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(configuredUser.password, 12);
        await run(
          `INSERT INTO users (display_name, email, password_hash, avatar_color)
           VALUES (?, ?, ?, ?)`,
          [configuredUser.displayName, configuredUser.email, passwordHash, colors[index]],
        );
        continue;
      }

      const passwordMatches = await bcrypt.compare(
        configuredUser.password,
        existingUser.password_hash,
      );
      const passwordHash = passwordMatches
        ? existingUser.password_hash
        : await bcrypt.hash(configuredUser.password, 12);
      await run(
        `UPDATE users
         SET display_name = ?, password_hash = ?, avatar_color = ?
         WHERE id = ?`,
        [configuredUser.displayName, passwordHash, colors[index], existingUser.id],
      );
    }

    const approvedUsers = await all(
      'SELECT id FROM users WHERE email IN (?, ?) ORDER BY id',
      config.approvedEmails,
    );
    if (approvedUsers.length !== 2) {
      throw new Error('DuoNook could not initialize exactly two approved accounts.');
    }

    let conversation = await get('SELECT id FROM conversations ORDER BY id LIMIT 1');
    if (!conversation) {
      const result = await run("INSERT INTO conversations (name) VALUES ('Our nook')");
      conversation = { id: result.id };
    }

    const approvedIds = approvedUsers.map((user) => user.id);
    await run('DELETE FROM message_reactions WHERE user_id NOT IN (?, ?)', approvedIds);
    await run('DELETE FROM conversation_members');
    await run('DELETE FROM conversations WHERE id != ?', [conversation.id]);
    const staleUsers = await all('SELECT id FROM users WHERE id NOT IN (?, ?)', approvedIds);
    if (staleUsers.length > 0) {
      const staleIds = staleUsers.map((user) => user.id);
      const placeholders = staleIds.map(() => '?').join(', ');
      const authoredMessages = await get(
        `SELECT COUNT(*) AS count FROM messages WHERE sender_id IN (${placeholders})`,
        staleIds,
      );
      if (authoredMessages.count > 0) {
        throw new Error(
          'Configured account emails cannot replace users who already have message history.',
        );
      }
      await run(`DELETE FROM users WHERE id IN (${placeholders})`, staleIds);
    }

    for (const user of approvedUsers) {
      await run(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES (?, ?)`,
        [conversation.id, user.id],
      );
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

export const db = { run, get, all };
