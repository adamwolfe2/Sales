/**
 * Server Sync Utility
 * Handles WebSocket connection to VendingPreneurs server
 * Syncs content in real-time and manages authentication
 */

const { io } = require('socket.io-client');
const Store = require('electron-store');

const store = new Store({
  name: 'vendingpreneurs-config',
  encryptionKey: 'vp-sales-assistant-2024'
});

let socket = null;
let mainWindow = null;
let contentStore = {
  objections: [],
  playbooks: [],
  testimonials: [],
  patterns: [],
  systemPrompt: '',
  lastSync: null
};

const DEFAULT_SERVER = 'http://localhost:3000';

function getServerUrl() {
  return store.get('serverUrl', DEFAULT_SERVER);
}

function setServerUrl(url) {
  store.set('serverUrl', url);
}

function getAuthToken() {
  return store.get('authToken', null);
}

function setAuthToken(token) {
  store.set('authToken', token);
}

function clearAuth() {
  store.delete('authToken');
  store.delete('userName');
  store.delete('userRole');
}

function isAuthenticated() {
  return !!getAuthToken();
}

function getUserInfo() {
  return {
    name: store.get('userName', ''),
    role: store.get('userRole', 'rep'),
    teamId: store.get('teamId', '')
  };
}

function setUserInfo(info) {
  if (info.name) store.set('userName', info.name);
  if (info.role) store.set('userRole', info.role);
  if (info.teamId) store.set('teamId', info.teamId);
}

/**
 * Redeem invite code to get authentication token
 */
async function redeemInviteCode(code, name, serverUrl = null) {
  const server = serverUrl || getServerUrl();

  try {
    const response = await fetch(`${server}/api/auth/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase(), name })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to redeem invite code');
    }

    // Store auth info
    setAuthToken(data.token);
    setUserInfo({
      name: data.user.name,
      role: data.user.role,
      teamId: data.user.teamId
    });
    if (serverUrl) setServerUrl(serverUrl);

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Redeem invite error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify existing token is still valid
 */
async function verifyToken() {
  const token = getAuthToken();
  if (!token) return { valid: false };

  try {
    const response = await fetch(`${getServerUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAuth();
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, user: data.user };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Connect to server WebSocket
 */
function connectToServer(win) {
  mainWindow = win;
  const token = getAuthToken();

  if (!token) {
    console.log('No auth token, skipping server connection');
    return;
  }

  if (socket && socket.connected) {
    console.log('Already connected to server');
    return;
  }

  const serverUrl = getServerUrl();
  console.log('Connecting to server:', serverUrl);

  socket = io(serverUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    if (mainWindow) {
      mainWindow.webContents.send('server-connected');
    }
    // Initial content sync
    syncContent();
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    if (mainWindow) {
      mainWindow.webContents.send('server-disconnected', reason);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    if (mainWindow) {
      mainWindow.webContents.send('server-error', error.message);
    }
  });

  // Real-time content updates
  socket.on('content:objection:created', (objection) => {
    contentStore.objections.push(objection);
    notifyContentUpdate('objection', 'created', objection);
  });

  socket.on('content:objection:updated', (objection) => {
    const idx = contentStore.objections.findIndex(o => o.id === objection.id);
    if (idx >= 0) contentStore.objections[idx] = objection;
    notifyContentUpdate('objection', 'updated', objection);
  });

  socket.on('content:objection:deleted', ({ id }) => {
    contentStore.objections = contentStore.objections.filter(o => o.id !== id);
    notifyContentUpdate('objection', 'deleted', { id });
  });

  socket.on('content:playbook:created', (playbook) => {
    contentStore.playbooks.push(playbook);
    notifyContentUpdate('playbook', 'created', playbook);
  });

  socket.on('content:playbook:updated', (playbook) => {
    const idx = contentStore.playbooks.findIndex(p => p.id === playbook.id);
    if (idx >= 0) contentStore.playbooks[idx] = playbook;
    notifyContentUpdate('playbook', 'updated', playbook);
  });

  socket.on('content:playbook:deleted', ({ id }) => {
    contentStore.playbooks = contentStore.playbooks.filter(p => p.id !== id);
    notifyContentUpdate('playbook', 'deleted', { id });
  });

  socket.on('content:testimonial:created', (testimonial) => {
    contentStore.testimonials.push(testimonial);
    notifyContentUpdate('testimonial', 'created', testimonial);
  });

  socket.on('content:testimonial:updated', (testimonial) => {
    const idx = contentStore.testimonials.findIndex(t => t.id === testimonial.id);
    if (idx >= 0) contentStore.testimonials[idx] = testimonial;
    notifyContentUpdate('testimonial', 'updated', testimonial);
  });

  socket.on('content:testimonial:deleted', ({ id }) => {
    contentStore.testimonials = contentStore.testimonials.filter(t => t.id !== id);
    notifyContentUpdate('testimonial', 'deleted', { id });
  });

  socket.on('content:pattern:created', (pattern) => {
    contentStore.patterns.push(pattern);
    notifyContentUpdate('pattern', 'created', pattern);
  });

  socket.on('content:refresh', (data) => {
    console.log('Received refresh signal:', data.message);
    syncContent();
  });
}

function notifyContentUpdate(type, action, data) {
  if (mainWindow) {
    mainWindow.webContents.send('content-updated', { type, action, data });
  }
}

/**
 * Sync all content from server
 */
async function syncContent(incremental = false) {
  const token = getAuthToken();
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const params = new URLSearchParams();
    if (incremental && contentStore.lastSync) {
      params.set('since', contentStore.lastSync);
    }

    const response = await fetch(`${getServerUrl()}/api/content/sync?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to sync content');
    }

    const data = await response.json();

    if (data.fullSync || !incremental) {
      contentStore.objections = data.objections || [];
      contentStore.playbooks = data.playbooks || [];
      contentStore.testimonials = data.testimonials || [];
      contentStore.patterns = data.patterns || [];
    } else {
      // Merge incremental updates
      if (data.objections) {
        data.objections.forEach(obj => {
          const idx = contentStore.objections.findIndex(o => o.id === obj.id);
          if (idx >= 0) contentStore.objections[idx] = obj;
          else contentStore.objections.push(obj);
        });
      }
    }

    contentStore.lastSync = data.syncTimestamp;

    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('content-synced', {
        objectionCount: contentStore.objections.length,
        playbookCount: contentStore.playbooks.length,
        testimonialCount: contentStore.testimonials.length,
        patternCount: contentStore.patterns.length
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get system prompt from server (for Gemini)
 */
async function getSystemPrompt() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getServerUrl()}/api/content/system-prompt`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return null;

    const data = await response.json();
    contentStore.systemPrompt = data.systemPrompt;
    return data.systemPrompt;
  } catch (error) {
    console.error('Failed to get system prompt:', error);
    return null;
  }
}

/**
 * Disconnect from server
 */
function disconnectFromServer() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current content store
 */
function getContent() {
  return { ...contentStore };
}

/**
 * Get objections in format expected by gemini.js
 */
function getObjectionsForGemini() {
  return contentStore.objections.filter(o => o.is_active !== false);
}

module.exports = {
  getServerUrl,
  setServerUrl,
  getAuthToken,
  setAuthToken,
  clearAuth,
  isAuthenticated,
  getUserInfo,
  setUserInfo,
  redeemInviteCode,
  verifyToken,
  connectToServer,
  disconnectFromServer,
  syncContent,
  getSystemPrompt,
  getContent,
  getObjectionsForGemini
};
