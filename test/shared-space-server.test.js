import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sqlite3 from 'sqlite3';

let serverProcess;
let baseUrl;
let databasePath;
let temporaryDirectory;

function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Account hashing can take a moment on a fresh test database.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Shared-space test server did not start.');
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie');
}

function databaseRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath);
    database.get(sql, params, (error, row) => {
      database.close();
      if (error) reject(error);
      else resolve(row);
    });
  });
}

test.before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'duonook-shared-space-'));
  databasePath = path.join(temporaryDirectory, 'duonook.db');
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_PATH: databasePath,
      SESSION_SECRET: 'shared-space-test-secret-with-32-characters',
      DUONOOK_USER_ONE_NAME: 'Alex',
      DUONOOK_USER_ONE_EMAIL: 'alex@duonook.test',
      DUONOOK_USER_ONE_PASSWORD: 'alex-secret',
      DUONOOK_USER_TWO_NAME: 'Sam',
      DUONOOK_USER_TWO_EMAIL: 'sam@duonook.test',
      DUONOOK_USER_TWO_PASSWORD: 'sam-secret',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer();
});

test.after(async () => {
  if (serverProcess?.exitCode === null) {
    const exited = once(serverProcess, 'exit');
    serverProcess.kill();
    await exited;
  }
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

test('shared locations require authentication and validate labels and coordinates', async () => {
  const unauthorized = await fetch(`${baseUrl}/api/shared-locations`);
  assert.equal(unauthorized.status, 401);

  const cookie = await login('alex@duonook.test', 'alex-secret');
  const invalid = await fetch(`${baseUrl}/api/shared-locations/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ label: '', latitude: 91, longitude: 0 }),
  });
  assert.equal(invalid.status, 400);
});

test('a member shares only an approximate labeled area and can revoke it', async () => {
  const alexCookie = await login('alex@duonook.test', 'alex-secret');
  const samCookie = await login('sam@duonook.test', 'sam-secret');
  const shareResponse = await fetch(`${baseUrl}/api/shared-locations/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: alexCookie },
    body: JSON.stringify({ label: 'Downtown', latitude: 40.71283, longitude: -74.00611 }),
  });
  assert.equal(shareResponse.status, 200);
  const shared = (await shareResponse.json()).location;
  assert.equal(shared.label, 'Downtown');
  assert.equal(shared.userId, 1);
  assert.equal('latitude' in shared, false);
  assert.equal('longitude' in shared, false);

  const stored = await databaseRow(
    'SELECT latitude, longitude FROM shared_locations WHERE user_id = ?',
    [1],
  );
  assert.equal(stored.latitude, 40.71);
  assert.equal(stored.longitude, -74.01);

  const partnerView = await fetch(`${baseUrl}/api/shared-locations`, {
    headers: { Cookie: samCookie },
  });
  const locations = (await partnerView.json()).locations;
  assert.equal(locations.length, 1);
  assert.equal(locations[0].label, 'Downtown');
  assert.equal('latitude' in locations[0], false);

  const noWeatherWithoutSharing = await fetch(`${baseUrl}/api/weather/2`, {
    headers: { Cookie: alexCookie },
  });
  assert.equal(noWeatherWithoutSharing.status, 404);

  const revokeResponse = await fetch(`${baseUrl}/api/shared-locations/me`, {
    method: 'DELETE',
    headers: { Cookie: alexCookie },
  });
  assert.equal(revokeResponse.status, 204);
  assert.equal(await databaseRow('SELECT user_id FROM shared_locations WHERE user_id = 1'), undefined);
});
