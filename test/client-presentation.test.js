import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [appSource, stylesSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

test('message rows render the sender avatar on the correct side', () => {
  assert.match(appSource, /const sender = conversation\.members\.find\(\(member\) => member\.id === message\.senderId\)/);
  assert.match(appSource, /<Avatar member=\{sender\} size="message" \/>/);
  assert.match(stylesSource, /\.message-row \{[^}]*gap: 10px;/s);
  assert.match(stylesSource, /\.message-row--own \{ flex-direction: row-reverse; \}/);
});

test('sent bubbles stay cream while received bubbles follow the selected palette', () => {
  assert.match(stylesSource, /--partner-bubble: #2f6b59;/);
  assert.match(stylesSource, /--own-bubble: #fffefb;/);
  assert.match(stylesSource, /\[data-palette="sunset"\][^{]*\{[^}]*--partner-bubble: #713f61;/s);
  assert.match(stylesSource, /\[data-palette="lagoon"\][^{]*\{[^}]*--partner-bubble: #176b87;/s);
  assert.match(stylesSource, /\.message-bubble \{[^}]*background: var\(--partner-bubble\);/s);
  assert.match(stylesSource, /\.message-row--own \.message-bubble \{[^}]*background: var\(--own-bubble\);/s);
});

test('desktop chat uses the Galaxy S26 Ultra viewport width without resize controls', () => {
  assert.match(stylesSource, /\.app-shell \{[^}]*grid-template-columns: 284px 412px minmax\(0, 1fr\);/s);
  assert.match(stylesSource, /\.app-shell--focus \{ grid-template-columns: minmax\(0, 1fr\) 412px minmax\(0, 1fr\); \}/);
  assert.match(stylesSource, /@media \(max-width: 920px\)[^{]*\{[\s\S]*?\.app-shell \{ grid-template-columns: 236px 412px minmax\(0, 1fr\); \}/);
  assert.match(stylesSource, /@media \(max-width: 920px\)[^{]*\{[\s\S]*?\.app-shell--focus \{ grid-template-columns: minmax\(0, 1fr\) 412px minmax\(0, 1fr\); \}/);
  assert.doesNotMatch(appSource, /duonook-chat-width|chat-resizer|resizeChatWithKeyboard/);
});
