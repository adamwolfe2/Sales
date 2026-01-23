/**
 * VendingPreneurs Sales Assistant - Main Process
 * Real-time AI coaching overlay using Gemini Live API
 */

const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const { setupGeminiHandlers, stopAudioCapture } = require('./utils/gemini');

let mainWindow = null;
const geminiSessionRef = { current: null };

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    x: width - 440,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Allow click-through when not focused
  mainWindow.setIgnoreMouseEvents(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function setupGlobalShortcuts() {
  // Toggle visibility
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  // Toggle always on top
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      const isOnTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isOnTop);
      mainWindow.webContents.send('always-on-top-changed', !isOnTop);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setupGeminiHandlers(geminiSessionRef, mainWindow);
  setupGlobalShortcuts();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  stopAudioCapture();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAudioCapture();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupIpcHandlers() {
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window-toggle-pin', () => {
    if (mainWindow) {
      const isOnTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isOnTop);
      return !isOnTop;
    }
    return true;
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Load objection data
  ipcMain.handle('load-objection-data', async () => {
    try {
      const fs = require('fs');
      const dataPath = path.join(__dirname, '../../data/objections.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data };
    } catch (error) {
      console.error('Failed to load objection data:', error);
      return { success: false, error: error.message };
    }
  });

  // Load playbook data
  ipcMain.handle('load-playbook-data', async () => {
    try {
      const fs = require('fs');
      const dataPath = path.join(__dirname, '../../data/playbooks.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data };
    } catch (error) {
      console.error('Failed to load playbook data:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { mainWindow, geminiSessionRef };
