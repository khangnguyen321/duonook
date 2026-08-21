import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api.js';

const reactionChoices = ['❤️', '👍', '😂', '😮', '😢', '🎉'];
const nookPalettes = [
  { id: 'garden', label: 'Garden', colors: ['#2f6b59', '#f0a27d', '#f6cf67'] },
  { id: 'sunset', label: 'Sunset', colors: ['#713f61', '#ed765e', '#ffc857'] },
  { id: 'lagoon', label: 'Lagoon', colors: ['#176b87', '#38a89d', '#ffcb69'] },
];

const conversationPrompts = [
  'What made you smile today?',
  'One tiny thing I appreciate about you…',
  'Want to plan a little adventure?',
  'My favorite moment with you lately was…',
];

function Mark() {
  return <div className="mark" aria-hidden="true"><span /><span /></div>;
}

function Avatar({ member, size = 'regular', online = false }) {
  const initials = member.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="avatar-wrap">
      <div className={`avatar avatar--${size}`} style={{ '--avatar-color': member.avatarColor }} aria-label={member.displayName}>{initials}</div>
      {online && <span className="avatar-online" aria-label="Online" />}
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api.login(email, password);
      onLogin(result.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Welcome to DuoNook">
        <div className="brand brand--light"><Mark /><span>DuoNook</span></div>
        <div className="story-copy">
          <p className="eyebrow">A quiet place for just us</p>
          <h1>Keep the little moments close.</h1>
          <p>A private corner for two—made for quick hellos, shared thoughts, and the ordinary messages that make a day feel warmer.</p>
        </div>
        <p className="privacy-note">Private by design · Two accounts · One conversation</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="brand brand--mobile"><Mark /><span>DuoNook</span></div>
          <p className="eyebrow">Welcome back</p>
          <h2>Step into your nook</h2>
          <p className="form-intro">Sign in with one of the two approved accounts.</p>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Your private password" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Opening your nook…' : 'Enter DuoNook'}</button>
          <p className="form-footer">There is no public registration. Just the two of you.</p>
        </form>
      </section>
    </main>
  );
}

function messageDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function messageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function presenceText(presence, partner) {
  if (presence?.online) return 'Online now';
  const timestamp = presence?.lastSeenAt ?? partner?.lastSeenAt;
  if (!timestamp) return 'Offline';
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return `Last seen ${sameDay ? 'today ' : ''}${date.toLocaleString([], sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

function weatherDetails(code) {
  if (code === 0) return { icon: '☀', label: 'Clear' };
  if ([1, 2].includes(code)) return { icon: '🌤', label: 'Partly cloudy' };
  if (code === 3) return { icon: '☁', label: 'Cloudy' };
  if ([45, 48].includes(code)) return { icon: '≋', label: 'Foggy' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌦', label: 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧', label: 'Rainy' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄', label: 'Snowy' };
  if ([95, 96, 99].includes(code)) return { icon: 'ϟ', label: 'Stormy' };
  return { icon: '◌', label: 'Current weather' };
}

function sharedTime(timestamp) {
  if (!timestamp) return '';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (elapsedMinutes < 1) return 'just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)}h ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function MessageBubble({ message, sender, currentUser, seen, onEdit, onDelete, onReact }) {
  const own = message.senderId === currentUser.id;
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => setEditBody(message.body ?? ''), [message.body]);

  const groupedReactions = useMemo(() => reactionChoices.flatMap((emoji) => {
    const matches = message.reactions.filter((reaction) => reaction.emoji === emoji);
    return matches.length ? [{ emoji, count: matches.length, mine: matches.some((reaction) => reaction.userId === currentUser.id), names: matches.map((reaction) => reaction.displayName).join(', ') }] : [];
  }), [message.reactions, currentUser.id]);

  async function saveEdit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onEdit(message.id, editBody);
      if (saved) setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`message-row ${own ? 'message-row--own' : ''}`}>
      {sender && <Avatar member={sender} size="message" />}
      <div className="message-content">
        <div className={`message-bubble ${message.deletedAt ? 'message-bubble--deleted' : ''}`}>
          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={2000} autoFocus aria-label="Edit message" />
              <div><button type="button" onClick={() => setEditing(false)}>Cancel</button><button type="submit" disabled={saving || !editBody.trim()}>{saving ? 'Saving…' : 'Save'}</button></div>
            </form>
          ) : message.deletedAt ? <p className="deleted-copy">Message deleted</p> : <p>{message.body}</p>}
          {!editing && !message.deletedAt && (
            <div className="message-actions">
              <button type="button" onClick={() => setShowReactions((value) => !value)} aria-label="Add reaction">♡</button>
              {own && <button type="button" onClick={() => setEditing(true)} aria-label="Edit message">Edit</button>}
              {own && <button type="button" onClick={() => onDelete(message.id)} aria-label="Delete message">Delete</button>}
              {showReactions && <div className="reaction-picker" aria-label="Choose a reaction">{reactionChoices.map((emoji) => <button key={emoji} type="button" onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}>{emoji}</button>)}</div>}
            </div>
          )}
        </div>
        {groupedReactions.length > 0 && <div className="reaction-list">{groupedReactions.map((reaction) => <button key={reaction.emoji} type="button" className={reaction.mine ? 'reaction--mine' : ''} title={reaction.names} onClick={() => onReact(message.id, reaction.emoji)}>{reaction.emoji}<span>{reaction.count}</span></button>)}</div>}
        <div className="message-meta"><span>{messageTime(message.createdAt)}{message.editedAt ? ' · edited' : ''}</span>{own && seen && <span className="seen-label">Seen</span>}</div>
      </div>
    </article>
  );
}

function Conversation({ user, onLogout }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [presence, setPresence] = useState({});
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [readStates, setReadStates] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('duonook-theme') ?? 'light');
  const [palette, setPalette] = useState(() => localStorage.getItem('duonook-palette') ?? 'garden');
  const [focusMode, setFocusMode] = useState(false);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [locations, setLocations] = useState([]);
  const [weatherByUser, setWeatherByUser] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Home');
  const [locationBusy, setLocationBusy] = useState(false);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const partnerTypingTimerRef = useRef(null);
  const typingSentRef = useRef(false);
  const messageEndRef = useRef(null);

  const partner = useMemo(() => conversation?.members.find((member) => member.id !== user.id), [conversation, user.id]);
  const partnerPresence = partner ? presence[partner.id] : null;

  const mergeMessage = useCallback((incoming) => {
    setMessages((current) => {
      const exists = current.some((message) => message.id === incoming.id);
      const next = exists ? current.map((message) => message.id === incoming.id ? incoming : message) : [...current, incoming];
      return next.sort((left, right) => left.id - right.id);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('duonook-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('duonook-palette', palette);
  }, [palette]);

  useEffect(() => {
    let active = true;
    Promise.all([api.conversation(), api.messages(), api.sharedLocations()])
      .then(([conversationResult, messageResult, locationResult]) => {
        if (!active) return;
        const loadedConversation = conversationResult.conversation;
        setConversation(loadedConversation);
        setMessages(messageResult.messages);
        setLocations(locationResult.locations);
        setReadStates(Object.fromEntries(loadedConversation.members.map((member) => [member.id, member.lastReadMessageId])));
        const lastRead = loadedConversation.lastReadMessageId ?? 0;
        setUnread(messageResult.messages.filter((message) => message.senderId !== user.id && message.id > lastRead).length);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    socket.on('message:new', (message) => {
      mergeMessage(message);
      if (message.senderId !== user.id && document.hidden) {
        setUnread((value) => value + 1);
        if ('Notification' in window && Notification.permission === 'granted') new Notification(message.senderName, { body: message.body, tag: `duonook-${message.id}` });
      }
    });
    for (const eventName of ['message:updated', 'message:deleted', 'message:reaction']) socket.on(eventName, mergeMessage);
    socket.on('presence:snapshot', (snapshot) => setPresence(Object.fromEntries(snapshot.map((item) => [item.userId, item]))));
    socket.on('presence:update', (update) => setPresence((current) => ({ ...current, [update.userId]: update })));
    socket.on('typing:update', (update) => {
      if (update.userId === user.id) return;
      clearTimeout(partnerTypingTimerRef.current);
      setPartnerTyping(update.typing);
      if (update.typing) partnerTypingTimerRef.current = setTimeout(() => setPartnerTyping(false), 2500);
    });
    socket.on('conversation:read', ({ userId, messageId }) => setReadStates((current) => ({ ...current, [userId]: messageId })));
    socket.on('location:update', (update) => {
      setLocations((current) => update.shared
        ? [...current.filter((location) => location.userId !== update.location.userId), update.location].sort((left, right) => left.userId - right.userId)
        : current.filter((location) => location.userId !== update.userId));
    });
    socket.on('connect_error', (socketError) => setError(socketError.message));
    return () => {
      clearTimeout(typingTimerRef.current);
      clearTimeout(partnerTypingTimerRef.current);
      socket.disconnect();
    };
  }, [mergeMessage, user.id]);

  const locationFingerprint = locations.map((location) => `${location.userId}:${location.updatedAt}`).join('|');

  useEffect(() => {
    let active = true;
    if (!locations.length) {
      setWeatherByUser({});
      setWeatherLoading(false);
      return () => { active = false; };
    }
    async function loadWeather() {
      setWeatherLoading(true);
      const entries = await Promise.all(locations.map(async (location) => {
        try {
          const result = await api.weather(location.userId);
          return [location.userId, result.weather];
        } catch {
          return [location.userId, null];
        }
      }));
      if (active) {
        setWeatherByUser(Object.fromEntries(entries));
        setWeatherLoading(false);
      }
    }
    loadWeather();
    const refreshTimer = setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  // The fingerprint reloads weather only when a person shares, updates, or stops sharing.
  }, [locationFingerprint]);

  const markLatestRead = useCallback(async () => {
    if (document.hidden) return;
    const latestPartnerMessage = [...messages].reverse().find((message) => message.senderId !== user.id);
    setUnread(0);
    if (!latestPartnerMessage || (readStates[user.id] ?? 0) >= latestPartnerMessage.id) return;
    setReadStates((current) => ({ ...current, [user.id]: latestPartnerMessage.id }));
    try {
      await api.markRead(latestPartnerMessage.id);
    } catch (readError) {
      setError(readError.message);
    }
  }, [messages, readStates, user.id]);

  useEffect(() => {
    document.title = unread ? `(${unread}) DuoNook` : 'DuoNook';
    return () => { document.title = 'DuoNook'; };
  }, [unread]);

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) markLatestRead(); };
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) markLatestRead();
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [markLatestRead]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, partnerTyping]);

  function updateDraft(value) {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!typingSentRef.current && value.trim()) {
      socket.emit('typing:update', { typing: true });
      typingSentRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:update', { typing: false });
      typingSentRef.current = false;
    }, 1200);
  }

  function stopTyping() {
    clearTimeout(typingTimerRef.current);
    if (typingSentRef.current) socketRef.current?.emit('typing:update', { typing: false });
    typingSentRef.current = false;
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    const body = draft;
    setDraft('');
    stopTyping();
    setSending(true);
    setError('');
    try {
      const result = await api.sendMessage(body);
      mergeMessage(result.message);
    } catch (sendError) {
      setDraft(body);
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  async function editMessage(messageId, body) {
    try {
      const result = await api.editMessage(messageId, body);
      mergeMessage(result.message);
      return true;
    } catch (editError) {
      setError(editError.message);
      return false;
    }
  }

  async function deleteMessage(messageId) {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    try {
      const result = await api.deleteMessage(messageId);
      mergeMessage(result.message);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function reactToMessage(messageId, emoji) {
    try {
      const result = await api.reactToMessage(messageId, emoji);
      mergeMessage(result.message);
    } catch (reactionError) {
      setError(reactionError.message);
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return setError('Desktop notifications are not supported in this browser.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') setError('Notifications remain disabled. You can change this in your browser settings.');
  }

  async function shareMyLocation(event) {
    event.preventDefault();
    if (!locationLabel.trim() || locationBusy) return;
    if (!navigator.geolocation) {
      setError('Location sharing is not supported in this browser.');
      return;
    }
    setLocationBusy(true);
    setError('');
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10000 },
      ));
      const result = await api.shareLocation(
        locationLabel.trim(),
        position.coords.latitude,
        position.coords.longitude,
      );
      setLocations((current) => [...current.filter((location) => location.userId !== user.id), result.location].sort((left, right) => left.userId - right.userId));
    } catch (locationError) {
      const denied = locationError?.code === 1;
      setError(denied ? 'Location permission was not granted. Nothing was shared.' : (locationError.message ?? 'Your area could not be shared.'));
    } finally {
      setLocationBusy(false);
    }
  }

  async function stopSharingLocation() {
    setLocationBusy(true);
    setError('');
    try {
      await api.stopSharingLocation();
      setLocations((current) => current.filter((location) => location.userId !== user.id));
    } catch (locationError) {
      setError(locationError.message);
    } finally {
      setLocationBusy(false);
    }
  }

  async function logout() {
    socketRef.current?.disconnect();
    await onLogout();
  }

  const partnerReadId = partner ? readStates[partner.id] ?? 0 : 0;
  const today = new Date();
  const todayMessageCount = messages.filter((message) => new Date(message.createdAt).toDateString() === today.toDateString()).length;
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekMessageCount = messages.filter((message) => new Date(message.createdAt) >= weekStart).length;
  const latestMessage = [...messages].reverse().find((message) => !message.deletedAt);
  const latestSender = latestMessage ? conversation?.members.find((member) => member.id === latestMessage.senderId) : null;
  const prompt = conversationPrompts[new Date().getDate() % conversationPrompts.length];
  const ownLocation = locations.find((location) => location.userId === user.id);
  const partnerLocation = partner ? locations.find((location) => location.userId === partner.id) : null;

  function usePrompt(text) {
    setDraft((current) => current ? `${current}\n${text}` : text);
  }

  return (
    <main className={`app-shell ${focusMode ? 'app-shell--focus' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><Mark /><span>DuoNook</span></div>
        <div className="nook-portrait" aria-label="The two members of this nook">
          <div className="paired-avatars paired-avatars--large">{conversation?.members.map((member) => <Avatar key={member.id} member={member} size="regular" online={presence[member.id]?.online} />)}</div>
          <p className="eyebrow">Just the two of you</p>
          <h2>{conversation?.name ?? 'Our nook'}</h2>
          <p className="nook-subtitle">A small, private place to keep close.</p>
          {unread > 0 && <b className="unread-badge">{unread} new</b>}
        </div>

        <div className="nook-card daily-card">
          <span className="card-spark" aria-hidden="true">✦</span>
          <div><small>Today in your nook</small><strong>{todayMessageCount} {todayMessageCount === 1 ? 'little moment' : 'little moments'}</strong></div>
        </div>

        <div className="nook-card prompt-card">
          <small>A question for us</small>
          <p>{prompt}</p>
          <button type="button" onClick={() => usePrompt(prompt)}>Answer this <span aria-hidden="true">→</span></button>
        </div>
        <div className="sidebar-tools">
          <button type="button" onClick={() => setShowPaletteMenu((value) => !value)} aria-expanded={showPaletteMenu}><span className="tool-icon" aria-hidden="true">✺</span>Change the mood</button>
          {showPaletteMenu && <div className="palette-picker" aria-label="Choose a color mood">{nookPalettes.map((option) => (
            <button key={option.id} type="button" className={palette === option.id ? 'palette-option palette-option--active' : 'palette-option'} onClick={() => setPalette(option.id)} aria-pressed={palette === option.id}>
              <span className="palette-dots" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>{option.label}
            </button>
          ))}</div>}
          <button type="button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}><span className="tool-icon" aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>{theme === 'light' ? 'Evening glow' : 'Daylight'}</button>
          <button type="button" onClick={enableNotifications}><span className="tool-icon" aria-hidden="true">♢</span>Gentle notifications</button>
        </div>
        <div className="sidebar-profile">
          <Avatar member={user} size="small" online />
          <span><strong>{user.displayName}</strong><small>Signed in</small></span>
          <button className="icon-button" onClick={logout} title="Sign out" aria-label="Sign out">↗</button>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div className="mobile-mark"><Mark /></div>
          {partner ? <Avatar member={partner} size="small" online={partnerPresence?.online} /> : <div className="avatar-placeholder" />}
          <div className="header-person"><span className="header-kicker">Your person</span><h1>{partner?.displayName ?? 'Your person'}</h1><p className={partnerTyping ? 'typing-copy' : ''}>{partnerTyping ? 'Typing something to you…' : presenceText(partnerPresence, partner)}</p></div>
          <div className="header-center" aria-hidden="true"><span>Our little corner</span><i>♥</i></div>
          <button className="header-pill focus-toggle" type="button" onClick={() => setFocusMode((value) => !value)} aria-pressed={focusMode}>{focusMode ? 'Show nook' : 'Focus mode'}</button>
          <button className="mobile-tool" type="button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label="Toggle color theme">{theme === 'light' ? '☾' : '☀'}</button>
          <button className="mobile-tool" type="button" onClick={logout} aria-label="Sign out">↗</button>
        </header>

        <div className="message-space" aria-live="polite">
          {loading ? <div className="conversation-loading"><Mark /><span>Gathering your messages…</span></div> : messages.length === 0 ? (
            <div className="empty-state"><div className="empty-mark"><Mark /></div><p className="eyebrow">The start of your nook</p><h2>Leave a little note.</h2><p>A hello, a lunch idea, or just a tiny thought. This space belongs only to the two of you.</p><button type="button" onClick={() => usePrompt(prompt)}>Try today’s question</button></div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDate = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                const sender = conversation.members.find((member) => member.id === message.senderId);
                const lastOwnMessage = [...messages].reverse().find((item) => item.senderId === user.id);
                const seen = message.senderId === user.id && message.id <= partnerReadId && message.id === lastOwnMessage?.id;
                return <div key={message.id}>{showDate && <div className="date-divider"><span>{messageDateLabel(message.createdAt)}</span></div>}<MessageBubble message={message} sender={sender} currentUser={user} seen={seen} onEdit={editMessage} onDelete={deleteMessage} onReact={reactToMessage} /></div>;
              })}
              {partnerTyping && <div className="typing-bubble" aria-label={`${partner?.displayName} is typing`}><i /><i /><i /></div>}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {error && <div className="conversation-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          <form className="composer" onSubmit={sendMessage}>
            <button type="button" className="composer-love" onClick={() => usePrompt('Thinking of you ❤️')} aria-label="Add a thinking of you note">♥</button>
            <textarea value={draft} onChange={(event) => updateDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) sendMessage(event); }} placeholder={partner ? `Message ${partner.displayName}` : 'Write a message'} aria-label="Message" maxLength={2000} rows={1} disabled={loading || !conversation} />
            <span className={`character-count ${draft.length > 1800 ? 'character-count--visible' : ''}`}>{draft.length}/2000</span>
            <button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim() || sending}>{sending ? '…' : '↑'}</button>
          </form>
          <p className="composer-hint">Enter to send · Shift + Enter for a new line</p>
        </div>
      </section>
      <aside className="shared-dashboard" aria-label="Shared space dashboard">
        <header className="dashboard-header">
          <p className="eyebrow">Shared space</p>
          <h2>Your day, at a glance.</h2>
          <p>Weather, whereabouts, and little signals from your private nook.</p>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-weather">
            <div className="dashboard-card-heading"><span aria-hidden="true">☼</span><span>Weather where you are</span></div>
            {locations.length ? <div className="weather-list">{locations.map((location) => {
              const currentWeather = weatherByUser[location.userId];
              const details = currentWeather ? weatherDetails(currentWeather.weatherCode) : null;
              return <article className="weather-person" key={location.userId}>
                <div className="weather-icon" aria-hidden="true">{details?.icon ?? (weatherLoading ? '…' : '◌')}</div>
                <div><span>{location.displayName} · {location.label}</span><strong>{currentWeather ? `${currentWeather.temperature}°` : 'Weather unavailable'}</strong><small>{currentWeather ? `${details.label} · Feels ${currentWeather.feelsLike}° · Wind ${currentWeather.windSpeed} mph` : 'Try again in a little while'}</small></div>
              </article>;
            })}</div> : <div className="dashboard-empty-state"><strong>No weather spot yet</strong><p>Share your approximate area below to see local conditions.</p></div>}
            <small className="weather-credit">Weather by Open-Meteo · refreshed automatically</small>
          </section>

          <section className="dashboard-card dashboard-date" aria-label="Today">
            <span>{today.toLocaleDateString([], { weekday: 'long' })}</span>
            <strong>{today.getDate()}</strong>
            <small>{today.toLocaleDateString([], { month: 'long', year: 'numeric' })}</small>
          </section>

          <section className="dashboard-card dashboard-location">
            <div className="dashboard-card-heading"><span aria-hidden="true">⌖</span><span>Whereabouts</span></div>
            <div className="partner-location">
              {partnerLocation ? <><Avatar member={partner} size="small" online={partnerPresence?.online} /><div><strong>{partner.displayName} is near {partnerLocation.label}</strong><small>Shared {sharedTime(partnerLocation.updatedAt)} · approximate area</small></div></> : <><div className="location-placeholder" aria-hidden="true">⌁</div><div><strong>{partner?.displayName ?? 'Your person'} hasn’t shared an area</strong><small>They stay private until they choose to share.</small></div></>}
            </div>
            <form className="location-controls" onSubmit={shareMyLocation}>
              <label htmlFor="location-label">My area label</label>
              <div><input id="location-label" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} maxLength={40} placeholder="Home, work, downtown…" /><button type="submit" disabled={locationBusy || !locationLabel.trim()}>{locationBusy ? 'Sharing…' : ownLocation ? 'Update' : 'Share my area'}</button></div>
            </form>
            {ownLocation && <button className="stop-location" type="button" onClick={stopSharingLocation} disabled={locationBusy}>Stop sharing</button>}
            <p className="location-privacy">One-time, neighborhood-level update. No background tracking or location history.</p>
          </section>

          <section className="dashboard-card dashboard-presence">
            <div className="dashboard-card-heading"><span className={`presence-pulse ${partnerPresence?.online ? 'presence-pulse--online' : ''}`} aria-hidden="true" /><span>Connection</span></div>
            <div className="dashboard-people">
              {conversation?.members.map((member) => <Avatar key={member.id} member={member} size="small" online={presence[member.id]?.online} />)}
              <div><strong>{partnerPresence?.online ? 'Both here now' : 'Your nook is waiting'}</strong><p>{partnerPresence?.online ? `${partner?.displayName} is online with you.` : presenceText(partnerPresence, partner)}</p></div>
            </div>
          </section>

          <section className="dashboard-stats" aria-label="Conversation activity">
            <div><strong>{todayMessageCount}</strong><span>Today</span></div>
            <div><strong>{weekMessageCount}</strong><span>This week</span></div>
            <div><strong>{messages.length}</strong><span>Loaded</span></div>
          </section>

          <section className="dashboard-card dashboard-moment">
            <div className="dashboard-card-heading"><span aria-hidden="true">✦</span><span>Last little moment</span></div>
            {latestMessage ? <><p>“{latestMessage.body}”</p><small>{latestSender?.displayName ?? 'One of you'} · {messageTime(latestMessage.createdAt)}</small></> : <p className="dashboard-empty">Your first shared note will live here.</p>}
          </section>

          <section className="dashboard-card dashboard-start">
            <div className="dashboard-card-heading"><span aria-hidden="true">♡</span><span>Start something sweet</span></div>
            <div className="dashboard-actions">
              <button type="button" onClick={() => usePrompt('Thinking of you ❤️')}>Love note</button>
              <button type="button" onClick={() => usePrompt('Want to plan something together?')}>Make a plan</button>
              <button type="button" onClick={() => usePrompt(prompt)}>Daily question</button>
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.currentUser().then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function logout() { await api.logout(); setUser(null); }
  if (loading) return <div className="loading-screen"><Mark /><span>Opening your nook…</span></div>;
  return user ? <Conversation user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
