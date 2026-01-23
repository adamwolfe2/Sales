/**
 * Auto-Updater
 * Handles automatic updates via GitHub Releases
 * Updates are downloaded silently and installed on app restart
 */

const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

let mainWindow = null;

function setupAutoUpdater(win) {
  mainWindow = win;

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates silently
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Check for updates periodically (every 4 hours)
  setInterval(() => {
    checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

function checkForUpdates() {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Update check failed:', err.message);
    });
  } else {
    console.log('Skipping update check in development mode');
  }
}

function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  quitAndInstall
};
