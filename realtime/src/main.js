/**
 * VendingPreneurs Sales Assistant - Main Process
 * Real-time AI coaching overlay using Gemini Live API
 * With server sync for centralized content management
 */

const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const { setupGeminiHandlers, stopAudioCapture } = require('./utils/gemini');
const serverSync = require('./utils/serverSync');
const { setupAutoUpdater, checkForUpdates, quitAndInstall } = require('./utils/autoUpdater');

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

app.whenReady().then(async () => {
  createWindow();
  setupGeminiHandlers(geminiSessionRef, mainWindow);
  setupGlobalShortcuts();
  setupIpcHandlers();
  setupAutoUpdater(mainWindow);

  // Check authentication and connect to server if authenticated
  if (serverSync.isAuthenticated()) {
    const verify = await serverSync.verifyToken();
    if (verify.valid) {
      serverSync.connectToServer(mainWindow);
    }
  }
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

  // ============ AUTHENTICATION ============

  ipcMain.handle('check-auth', async () => {
    if (!serverSync.isAuthenticated()) {
      return { authenticated: false };
    }
    const verify = await serverSync.verifyToken();
    if (verify.valid) {
      return { authenticated: true, user: serverSync.getUserInfo() };
    }
    return { authenticated: false };
  });

  ipcMain.handle('redeem-invite', async (event, { code, name, serverUrl }) => {
    const result = await serverSync.redeemInviteCode(code, name, serverUrl);
    if (result.success) {
      // Connect to server after successful auth
      serverSync.connectToServer(mainWindow);
    }
    return result;
  });

  ipcMain.handle('logout', () => {
    serverSync.disconnectFromServer();
    serverSync.clearAuth();
    return { success: true };
  });

  ipcMain.handle('get-user-info', () => {
    return serverSync.getUserInfo();
  });

  // ============ SERVER SYNC ============

  ipcMain.handle('connect-server', () => {
    serverSync.connectToServer(mainWindow);
    return { success: true };
  });

  ipcMain.handle('disconnect-server', () => {
    serverSync.disconnectFromServer();
    return { success: true };
  });

  ipcMain.handle('sync-content', async () => {
    return await serverSync.syncContent();
  });

  ipcMain.handle('get-server-url', () => {
    return serverSync.getServerUrl();
  });

  ipcMain.handle('set-server-url', (event, url) => {
    serverSync.setServerUrl(url);
    return { success: true };
  });

  // ============ CONTENT LOADING ============

  // Load objection data - from server if connected, else local file
  ipcMain.handle('load-objection-data', async () => {
    try {
      // Try to get from server first
      const content = serverSync.getContent();
      if (content.objections && content.objections.length > 0) {
        // Transform to expected format
        const objectionMap = {};
        content.objections
          .filter(o => o.is_active !== false)
          .forEach(obj => {
            objectionMap[obj.name] = {
              category: obj.category,
              variations: obj.variations || [],
              winRate: obj.win_rate,
              difficulty: obj.difficulty,
              frequency: obj.frequency,
              rank: obj.rank,
              responses: typeof obj.responses === 'string' ? JSON.parse(obj.responses) : obj.responses,
              warning: obj.warning,
              dangerCombo: obj.danger_combo ? (typeof obj.danger_combo === 'string' ? JSON.parse(obj.danger_combo) : obj.danger_combo) : null
            };
          });
        return { success: true, data: { objections: objectionMap }, source: 'server' };
      }

      // Fallback to local file
      const fs = require('fs');
      const dataPath = path.join(__dirname, '../../data/objections.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data, source: 'local' };
    } catch (error) {
      console.error('Failed to load objection data:', error);
      return { success: false, error: error.message };
    }
  });

  // Load playbook data - from server if connected, else local file
  ipcMain.handle('load-playbook-data', async () => {
    try {
      // Try to get from server first
      const content = serverSync.getContent();
      if (content.playbooks && content.playbooks.length > 0) {
        // Transform to expected format grouped by author
        const playbooksByAuthor = {};
        content.playbooks
          .filter(p => p.is_active !== false)
          .forEach(pb => {
            if (!playbooksByAuthor[pb.author]) {
              playbooksByAuthor[pb.author] = { phases: {} };
            }
            playbooksByAuthor[pb.author].phases[pb.phase] = {
              name: pb.name,
              description: pb.description,
              content: typeof pb.content === 'string' ? JSON.parse(pb.content) : pb.content,
              duration: pb.duration_minutes
            };
          });
        return { success: true, data: { playbooks: playbooksByAuthor }, source: 'server' };
      }

      // Fallback to local file
      const fs = require('fs');
      const dataPath = path.join(__dirname, '../../data/playbooks.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data, source: 'local' };
    } catch (error) {
      console.error('Failed to load playbook data:', error);
      return { success: false, error: error.message };
    }
  });

  // Load testimonials from server
  ipcMain.handle('load-testimonial-data', async () => {
    try {
      const content = serverSync.getContent();
      if (content.testimonials && content.testimonials.length > 0) {
        return { success: true, data: content.testimonials.filter(t => t.is_active !== false), source: 'server' };
      }

      // Fallback to local file
      const fs = require('fs');
      const dataPath = path.join(__dirname, '../../data/testimonials.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return { success: true, data: data.testimonials || [], source: 'local' };
    } catch (error) {
      console.error('Failed to load testimonial data:', error);
      return { success: false, error: error.message };
    }
  });

  // Get system prompt for Gemini
  ipcMain.handle('get-system-prompt', async () => {
    const prompt = await serverSync.getSystemPrompt();
    return { success: !!prompt, prompt };
  });

  // ============ AUTO-UPDATE ============

  ipcMain.handle('check-for-updates', () => {
    checkForUpdates();
    return { success: true };
  });

  ipcMain.handle('install-update', () => {
    quitAndInstall();
    return { success: true };
  });
}

module.exports = { mainWindow, geminiSessionRef };
