/**
 * Preload script - Secure bridge between main and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Gemini controls
  connect: (apiKey) => ipcRenderer.invoke('gemini-connect', apiKey),
  disconnect: () => ipcRenderer.invoke('gemini-disconnect'),
  sendAudio: (data) => ipcRenderer.invoke('gemini-send-audio', data),
  sendText: (text) => ipcRenderer.invoke('gemini-send-text', text),
  getSessionStatus: () => ipcRenderer.invoke('get-session-status'),

  // Data loading
  loadObjectionData: () => ipcRenderer.invoke('load-objection-data'),
  loadPlaybookData: () => ipcRenderer.invoke('load-playbook-data'),

  // Event listeners
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

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
