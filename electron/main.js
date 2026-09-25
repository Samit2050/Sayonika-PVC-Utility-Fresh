
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
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// Application State
// ===============================

let mainWindow = null;
let updateDownloaded = false;
let isCheckingForUpdate = false;
let isDownloadingUpdate = false;
let isOpeningCroppedFolder = false;

// ===============================
// Cropped Files Folder
// ===============================

const croppedFilesDirectory = path.join(
  'C:\\',
  'Cropped Files'
);

// ===============================
// Create Main Window
// ===============================

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

  const indexPath = path.join(
    __dirname,
    '..',
    'dist',
    'index.html'
  );

  mainWindow.loadFile(indexPath);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      shell.openExternal(url);
    }

    return {
      action: 'deny'
    };
  });

  mainWindow.webContents.on(
    'will-navigate',
    (event, url) => {
      if (
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  );

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      console.error(
        'Electron failed to load application.'
      );

      console.error('Error Code:', errorCode);
      console.error('Error:', errorDescription);
      console.error('Path:', indexPath);
    }
  );

  mainWindow.webContents.on(
    'did-finish-load',
    () => {
      console.log(
        'Sayonika PVC Utility loaded successfully.'
      );
    }
  );

  mainWindow.once(
    'ready-to-show',
    () => {
      mainWindow.show();
    }
  );

  mainWindow.on(
    'closed',
    () => {
      mainWindow = null;
    }
  );
}

// ===============================
// Update Status
// ===============================

function sendUpdateStatus(
  status,
  data = {}
) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return;
  }

  mainWindow.webContents.send(
    'update-status',
    {
      status,
      ...data
    }
  );
}

// ===============================
// Auto Updater Configuration
// ===============================

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on(
    'checking-for-update',
    () => {
      console.log(
        'Checking for application updates...'
      );

      sendUpdateStatus('checking');
    }
  );

  autoUpdater.on(
    'update-available',
    (info) => {
      console.log(
        'Update available:',
        info.version
      );

      sendUpdateStatus(
        'available',
        {
          version: info.version,
          releaseDate: info.releaseDate || null
        }
      );
    }
  );

  autoUpdater.on(
    'update-not-available',
    (info) => {
      console.log(
        'Application is up to date.'
      );

      isCheckingForUpdate = false;

      sendUpdateStatus(
        'not-available',
        {
          version: info.version
        }
      );
    }
  );

  autoUpdater.on(
    'download-progress',
    (progress) => {
      isDownloadingUpdate = true;

      console.log(
        `Update download: ${progress.percent.toFixed(1)}%`
      );

      sendUpdateStatus(
        'downloading',
        {
          percent: progress.percent,
          transferred: progress.transferred,
          total: progress.total,
          bytesPerSecond: progress.bytesPerSecond
        }
      );
    }
  );

  autoUpdater.on(
    'update-downloaded',
    (info) => {
      isCheckingForUpdate = false;
      isDownloadingUpdate = false;
      updateDownloaded = true;

      console.log(
        'Update downloaded:',
        info.version
      );

      sendUpdateStatus(
        'downloaded',
        {
          version: info.version
        }
      );
    }
  );

  autoUpdater.on(
    'error',
    (error) => {
      isCheckingForUpdate = false;
      isDownloadingUpdate = false;

      console.error(
        'Auto update error:',
        error
      );

      sendUpdateStatus(
        'error',
        {
          message:
            error?.message ||
            'Unknown update error'
        }
      );
    }
  );
}

// ===============================
// Check for Updates
// ===============================

async function checkForUpdates() {
  if (isCheckingForUpdate) {
    return {
      success: false,
      message:
        'Update check already in progress.'
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

    console.error(
      'Failed to check for updates:',
      error
    );

    sendUpdateStatus(
      'error',
      {
        message:
          error?.message ||
          'Failed to check for updates.'
      }
    );

    return {
      success: false,
      message:
        error?.message ||
        'Failed to check for updates.'
    };
  }
}

// ===============================
// Download Update
// ===============================

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
      message:
        'Update download is already in progress.'
    };
  }

  try {
    isDownloadingUpdate = true;

    sendUpdateStatus(
      'download-started'
    );

    await autoUpdater.downloadUpdate();

    return {
      success: true
    };
  } catch (error) {
    isDownloadingUpdate = false;

    console.error(
      'Failed to download update:',
      error
    );

    sendUpdateStatus(
      'error',
      {
        message:
          error?.message ||
          'Failed to download update.'
      }
    );

    return {
      success: false,
      message:
        error?.message ||
        'Failed to download update.'
    };
  }
}

// ===============================
// Install Update
// ===============================

function installUpdate() {
  if (!updateDownloaded) {
    return {
      success: false,
      message:
        'No downloaded update is available.'
    };
  }

  sendUpdateStatus('installing');

  setImmediate(() => {
    autoUpdater.quitAndInstall(
      false,
      true
    );
  });

  return {
    success: true
  };
}

// ===============================
// File Name Security
// ===============================

function sanitizeOutputFileName(
  fileName
) {
  const originalName = String(
    fileName || 'output'
  );

  const baseName = path.basename(
    originalName
  );

  const safeName = baseName
    .replace(
      /[<>:"/\\|?*\u0000-\u001F]/g,
      '_'
    )
    .trim();

  return safeName || 'output';
}

// ===============================
// Convert Data to Buffer
// ===============================

function convertDataToBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }

  if (Array.isArray(data)) {
    return Buffer.from(data);
  }

  if (
    data &&
    data.type === 'Buffer' &&
    Array.isArray(data.data)
  ) {
    return Buffer.from(data.data);
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(
      new Uint8Array(data)
    );
  }

  throw new Error(
    'Unsupported file data format.'
  );
}

// ===============================
// Save File to Cropped Files Folder
// ===============================

async function saveFileToCroppedFolder(
  fileName,
  data
) {
  const safeFileName =
    sanitizeOutputFileName(
      fileName
    );

  const fileBuffer =
    convertDataToBuffer(data);

  await fs.mkdir(
    croppedFilesDirectory,
    {
      recursive: true
    }
  );

  const filePath = path.join(
    croppedFilesDirectory,
    safeFileName
  );

  await fs.writeFile(
    filePath,
    fileBuffer
  );

  console.log(
    'File saved successfully:',
    filePath
  );

  return {
    success: true,
    filePath
  };
}

// ===============================
// Open Cropped Files Folder
// ===============================

async function openCroppedFolder() {
  if (isOpeningCroppedFolder) {
    return {
      success: true,
      message:
        'Cropped Files folder is already opening.'
    };
  }

  isOpeningCroppedFolder = true;

  try {
    await fs.mkdir(
      croppedFilesDirectory,
      {
        recursive: true
      }
    );

    const errorMessage =
      await shell.openPath(
        croppedFilesDirectory
      );

    if (errorMessage) {
      console.error(
        'Failed to open Cropped Files folder:',
        errorMessage
      );

      return {
        success: false,
        message: errorMessage
      };
    }

    return {
      success: true
    };
  } finally {
    isOpeningCroppedFolder = false;
  }
}

// ===============================
// Register IPC Handlers
// ===============================

function registerIPC() {
  ipcMain.handle(
    'get-app-version',
    () => {
      return app.getVersion();
    }
  );

  ipcMain.handle(
    'check-for-updates',
    async () => {
      return await checkForUpdates();
    }
  );

  ipcMain.handle(
    'download-update',
    async () => {
      return await downloadUpdate();
    }
  );

  ipcMain.handle(
    'install-update',
    () => {
      return installUpdate();
    }
  );

  ipcMain.handle(
    'save-file-to-cropped-folder',
    async (
      _event,
      payload
    ) => {
      try {
        if (
          !payload ||
          typeof payload.fileName !== 'string'
        ) {
          return {
            success: false,
            message:
              'Invalid file name.'
          };
        }

        const result =
          await saveFileToCroppedFolder(
            payload.fileName,
            payload.data
          );

        return result;
      } catch (error) {
        console.error(
          'Failed to save file:',
          error
        );

        return {
          success: false,
          message:
            error?.message ||
            'Failed to save file.'
        };
      }
    }
  );

  ipcMain.handle(
    'open-cropped-folder',
    async () => {
      try {
        return await openCroppedFolder();
      } catch (error) {
        console.error(
          'Failed to open Cropped Files folder:',
          error
        );

        return {
          success: false,
          message:
            error?.message ||
            'Failed to open Cropped Files folder.'
        };
      }
    }
  );
}

// ===============================
// Application Startup
// ===============================

app.whenReady().then(() => {
  createWindow();
  configureAutoUpdater();
  registerIPC();

  app.on(
    'activate',
    () => {
      if (
        BrowserWindow.getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

// ===============================
// Close Application
// ===============================

app.on(
  'window-all-closed',
  () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
);
