async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'The nook could not be reached.');
  }

  return response.status === 204 ? null : response.json();
}

export const api = {
  currentUser: () => request('/api/auth/me'),
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  conversation: () => request('/api/conversation'),
  messages: () => request('/api/messages'),
  sendMessage: (body) => request('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ body }),
  }),
  editMessage: (messageId, body) => request(`/api/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  }),
  deleteMessage: (messageId) => request(`/api/messages/${messageId}`, { method: 'DELETE' }),
  reactToMessage: (messageId, emoji) => request(`/api/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  }),
  markRead: (messageId) => request('/api/conversation/read', {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  }),
};
