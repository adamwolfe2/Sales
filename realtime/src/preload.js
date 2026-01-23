/**
 * Preload script - Secure bridge between main and renderer
 * Includes server sync capabilities for centralized content management
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Authentication
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  redeemInvite: (code, name, serverUrl) => ipcRenderer.invoke('redeem-invite', { code, name, serverUrl }),
  logout: () => ipcRenderer.invoke('logout'),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),

  // Server sync
  connectServer: () => ipcRenderer.invoke('connect-server'),
  disconnectServer: () => ipcRenderer.invoke('disconnect-server'),
  syncContent: () => ipcRenderer.invoke('sync-content'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),

  // Gemini controls
  connect: (apiKey) => ipcRenderer.invoke('gemini-connect', apiKey),
  disconnect: () => ipcRenderer.invoke('gemini-disconnect'),
  sendAudio: (data) => ipcRenderer.invoke('gemini-send-audio', data),
  sendText: (text) => ipcRenderer.invoke('gemini-send-text', text),
  getSessionStatus: () => ipcRenderer.invoke('get-session-status'),

  // Data loading
  loadObjectionData: () => ipcRenderer.invoke('load-objection-data'),
  loadPlaybookData: () => ipcRenderer.invoke('load-playbook-data'),
  loadTestimonialData: () => ipcRenderer.invoke('load-testimonial-data'),
  getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),

  // Auto-updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Event listeners - Server
  onServerConnected: (callback) => {
    ipcRenderer.on('server-connected', (event) => callback());
  },
  onServerDisconnected: (callback) => {
    ipcRenderer.on('server-disconnected', (event, reason) => callback(reason));
  },
  onServerError: (callback) => {
    ipcRenderer.on('server-error', (event, error) => callback(error));
  },
  onContentSynced: (callback) => {
    ipcRenderer.on('content-synced', (event, data) => callback(data));
  },
  onContentUpdated: (callback) => {
    ipcRenderer.on('content-updated', (event, data) => callback(data));
  },

  // Event listeners - Gemini
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
  onSessionConnected: (callback) => {
    ipcRenderer.on('session-connected', (event, data) => callback(data));
  },
  onSessionError: (callback) => {
    ipcRenderer.on('session-error', (event, data) => callback(data));
  },
  onTranscriptionUpdate: (callback) => {
    ipcRenderer.on('transcription-update', (event, data) => callback(data));
  },
  onSpeakerUpdate: (callback) => {
    ipcRenderer.on('speaker-update', (event, data) => callback(data));
  },
  onNewSuggestion: (callback) => {
    ipcRenderer.on('new-suggestion', (event, data) => callback(data));
  },
  onUpdateSuggestion: (callback) => {
    ipcRenderer.on('update-suggestion', (event, data) => callback(data));
  },
  onSuggestionComplete: (callback) => {
    ipcRenderer.on('suggestion-complete', (event, data) => callback(data));
  },
  onObjectionsDetected: (callback) => {
    ipcRenderer.on('objections-detected', (event, data) => callback(data));
  },
  onDangerAlert: (callback) => {
    ipcRenderer.on('danger-alert', (event, data) => callback(data));
  },
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (event, data) => callback(data));
  },

  // Event listeners - Auto-update
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
