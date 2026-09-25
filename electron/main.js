
import {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain
} from 'electron';

import updaterPackage from 'electron-updater';

const { autoUpdater } = updaterPackage;

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPDATE_CONFIG_URL =
  'https://raw.githubusercontent.com/Samit2050/Sayonika-PVC-Utility-Fresh/main/update-config.json';

let mainWindow = null;
let updateDownloaded = false;
let isCheckingForUpdate = false;
let isDownloadingUpdate = false;

let remoteUpdateConfig = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

  mainWindow.loadFile(indexPath);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      console.error('Electron failed to load application.');
      console.error('Error Code:', errorCode);
      console.error('Error:', errorDescription);
      console.error('Path:', indexPath);
    }
  );

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Sayonika PVC Utility loaded successfully.');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendUpdateStatus(status, data = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('update-status', {
    status,
    ...data
  });
}

function normalizeVersion(version) {
  return String(version || '')
    .trim()
    .replace(/^v/i, '');
}

function compareVersions(versionA, versionB) {
  const partsA = normalizeVersion(versionA)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);

  const partsB = normalizeVersion(versionB)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);

  const length = Math.max(partsA.length, partsB.length);

  for (let index = 0; index < length; index += 1) {
    const numberA = partsA[index] || 0;
    const numberB = partsB[index] || 0;

    if (numberA > numberB) {
      return 1;
    }

    if (numberA < numberB) {
      return -1;
    }
  }

  return 0;
}

async function loadRemoteUpdateConfig() {
  try {
    const response = await fetch(UPDATE_CONFIG_URL, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(
        `Remote update config request failed with status ${response.status}.`
      );
    }

    const config = await response.json();

    if (!config || typeof config !== 'object') {
      throw new Error('Remote update config has an invalid format.');
    }

    remoteUpdateConfig = {
      latestVersion: String(config.latestVersion || ''),
      minimumRequiredVersion: String(
        config.minimumRequiredVersion || ''
      ),
      forceUpdate: config.forceUpdate === true,
      updateMessage: String(
        config.updateMessage ||
          'Please update the application to continue.'
      )
    };

    console.log('Remote update configuration loaded.');

    return remoteUpdateConfig;
  } catch (error) {
    remoteUpdateConfig = null;

    console.error(
      'Failed to load remote update configuration:',
      error?.message || error
    );

    return null;
  }
}

async function getForceUpdateStatus() {
  const installedVersion = app.getVersion();

  const config =
    remoteUpdateConfig || (await loadRemoteUpdateConfig());

  if (!config) {
    return {
      success: false,
      forceUpdateRequired: false,
      installedVersion,
      latestVersion: null,
      minimumRequiredVersion: null,
      forceUpdate: false,
      updateMessage: '',
      message: 'Remote update configuration could not be loaded.'
    };
  }

  const minimumRequiredVersion =
    config.minimumRequiredVersion || '0.0.0';

  const installedVersionIsBelowMinimum =
    compareVersions(installedVersion, minimumRequiredVersion) < 0;

  const forceUpdateRequired =
    config.forceUpdate === true &&
    installedVersionIsBelowMinimum;

  return {
    success: true,
    forceUpdateRequired,
    installedVersion,
    latestVersion: config.latestVersion || null,
    minimumRequiredVersion,
    forceUpdate: config.forceUpdate,
    updateMessage: config.updateMessage,
    message: forceUpdateRequired
      ? 'A mandatory update is required.'
      : 'Force update is not required.'
  };
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for application updates...');

    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);

    sendUpdateStatus('available', {
      version: info.version,
      releaseDate: info.releaseDate || null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Application is up to date.');

    isCheckingForUpdate = false;

    sendUpdateStatus('not-available', {
      version: info.version
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    isDownloadingUpdate = true;

    console.log(
      `Update download: ${progress.percent.toFixed(1)}%`
    );

    sendUpdateStatus('downloading', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    isCheckingForUpdate = false;
    isDownloadingUpdate = false;
    updateDownloaded = true;

    console.log('Update downloaded:', info.version);

    sendUpdateStatus('downloaded', {
      version: info.version
    });
  });

  autoUpdater.on('error', (error) => {
    isCheckingForUpdate = false;
    isDownloadingUpdate = false;

    console.error('Auto update error:', error);

    sendUpdateStatus('error', {
      message: error?.message || 'Unknown update error'
    });
  });
}

async function checkForUpdates() {
  if (isCheckingForUpdate) {
    return {
      success: false,
      message: 'Update check already in progress.'
    };
  }

  if (!app.isPackaged) {
    console.log(
      'Update check skipped because the application is running in development mode.'
    );

    sendUpdateStatus('dev-mode');

    return {
      success: false,
      message:
        'Updates are available only in the installed production application.'
    };
  }

  isCheckingForUpdate = true;

  try {
    await autoUpdater.checkForUpdates();

    return {
      success: true
    };
  } catch (error) {
    isCheckingForUpdate = false;

    console.error('Failed to check for updates:', error);

    sendUpdateStatus('error', {
      message: error?.message || 'Failed to check for updates.'
    });

    return {
      success: false,
      message: error?.message || 'Failed to check for updates.'
    };
  }
}

async function downloadUpdate() {
  if (!app.isPackaged) {
    return {
      success: false,
      message:
        'Updates are available only in the installed production application.'
    };
  }

  if (isDownloadingUpdate) {
    return {
      success: false,
      message: 'Update download is already in progress.'
    };
  }

  try {
    isDownloadingUpdate = true;

    sendUpdateStatus('download-started');

    await autoUpdater.downloadUpdate();

    return {
      success: true
    };
  } catch (error) {
    isDownloadingUpdate = false;

    console.error('Failed to download update:', error);

    sendUpdateStatus('error', {
      message: error?.message || 'Failed to download update.'
    });

    return {
      success: false,
      message: error?.message || 'Failed to download update.'
    };
  }
}

function installUpdate() {
  if (!updateDownloaded) {
    return {
      success: false,
      message: 'No downloaded update is available.'
    };
  }

  sendUpdateStatus('installing');

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return {
    success: true
  };
}

function registerIPC() {
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-force-update-status', async () => {
    return await getForceUpdateStatus();
  });

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates();
  });

  ipcMain.handle('download-update', async () => {
    return await downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    return installUpdate();
  });
}

app.whenReady().then(async () => {
  await loadRemoteUpdateConfig();

  createWindow();
  configureAutoUpdater();
  registerIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
