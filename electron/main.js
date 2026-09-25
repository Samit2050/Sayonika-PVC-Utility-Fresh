import {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain
} from 'electron';

import updaterPackage from 'electron-updater';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
|--------------------------------------------------------------------------
| Electron Updater
|--------------------------------------------------------------------------
| electron-updater is loaded through its CommonJS default export.
*/

const { autoUpdater } = updaterPackage;

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
|--------------------------------------------------------------------------
| Global State
|--------------------------------------------------------------------------
*/

let mainWindow = null;

let updateDownloaded = false;

let isCheckingForUpdate = false;

let isDownloadingUpdate = false;

/*
|--------------------------------------------------------------------------
| Create Main Window
|--------------------------------------------------------------------------
*/

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

      preload: path.join(
        __dirname,
        'preload.js'
      )
    }
  });

  /*
  |--------------------------------------------------------------------------
  | Remove Default Electron Menu
  |--------------------------------------------------------------------------
  */

  Menu.setApplicationMenu(null);

  /*
  |--------------------------------------------------------------------------
  | Load Vite Production Build
  |--------------------------------------------------------------------------
  */

  const indexPath = path.join(
    __dirname,
    '..',
    'dist',
    'index.html'
  );

  mainWindow.loadFile(indexPath);

  /*
  |--------------------------------------------------------------------------
  | Open External HTTP/HTTPS Links in Windows Default Browser
  |--------------------------------------------------------------------------
  */

  mainWindow.webContents.setWindowOpenHandler(
    ({ url }) => {
      if (
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) {
        shell.openExternal(url);
      }

      return {
        action: 'deny'
      };
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Prevent External Navigation Inside Electron
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Page Load Error
  |--------------------------------------------------------------------------
  */

  mainWindow.webContents.on(
    'did-fail-load',
    (
      _event,
      errorCode,
      errorDescription
    ) => {
      console.error(
        'Electron failed to load application.'
      );

      console.error(
        'Error Code:',
        errorCode
      );

      console.error(
        'Error:',
        errorDescription
      );

      console.error(
        'Path:',
        indexPath
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Page Loaded
  |--------------------------------------------------------------------------
  */

  mainWindow.webContents.on(
    'did-finish-load',
    () => {
      console.log(
        'Sayonika PVC Utility loaded successfully.'
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Show Window After Ready
  |--------------------------------------------------------------------------
  */

  mainWindow.once(
    'ready-to-show',
    () => {
      mainWindow.show();
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Window Closed
  |--------------------------------------------------------------------------
  */

  mainWindow.on(
    'closed',
    () => {
      mainWindow = null;
    }
  );
}

/*
|--------------------------------------------------------------------------
| Send Update Status to React
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Configure Electron Auto Updater
|--------------------------------------------------------------------------
*/

function configureAutoUpdater() {
  /*
  |--------------------------------------------------------------------------
  | Important:
  | We manually control download.
  |--------------------------------------------------------------------------
  */

  autoUpdater.autoDownload = false;

  autoUpdater.autoInstallOnAppQuit = true;

  /*
  |--------------------------------------------------------------------------
  | Checking
  |--------------------------------------------------------------------------
  */

  autoUpdater.on(
    'checking-for-update',
    () => {
      console.log(
        'Checking for application updates...'
      );

      sendUpdateStatus(
        'checking'
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Update Available
  |--------------------------------------------------------------------------
  */

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

          releaseDate:
            info.releaseDate || null
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | No Update Available
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Download Progress
  |--------------------------------------------------------------------------
  */

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
          percent:
            progress.percent,

          transferred:
            progress.transferred,

          total:
            progress.total,

          bytesPerSecond:
            progress.bytesPerSecond
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Update Downloaded
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Updater Error
  |--------------------------------------------------------------------------
  */

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

/*
|--------------------------------------------------------------------------
| Check for Updates
|--------------------------------------------------------------------------
*/

async function checkForUpdates() {
  /*
  |--------------------------------------------------------------------------
  | Prevent Duplicate Checks
  |--------------------------------------------------------------------------
  */

  if (isCheckingForUpdate) {
    return {
      success: false,

      message:
        'Update check already in progress.'
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Development Mode
  |--------------------------------------------------------------------------
  */

  if (!app.isPackaged) {
    console.log(
      'Update check skipped because the application is running in development mode.'
    );

    sendUpdateStatus(
      'dev-mode'
    );

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

/*
|--------------------------------------------------------------------------
| Download Update
|--------------------------------------------------------------------------
*/

async function downloadUpdate() {
  /*
  |--------------------------------------------------------------------------
  | Development Mode
  |--------------------------------------------------------------------------
  */

  if (!app.isPackaged) {
    return {
      success: false,

      message:
        'Updates are available only in the installed production application.'
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent Duplicate Downloads
  |--------------------------------------------------------------------------
  */

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

/*
|--------------------------------------------------------------------------
| Install Downloaded Update
|--------------------------------------------------------------------------
*/

function installUpdate() {
  if (!updateDownloaded) {
    return {
      success: false,

      message:
        'No downloaded update is available.'
    };
  }

  sendUpdateStatus(
    'installing'
  );

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

/*
|--------------------------------------------------------------------------
| IPC Handlers
|--------------------------------------------------------------------------
*/

function registerIPC() {
  /*
  |--------------------------------------------------------------------------
  | Get Application Version
  |--------------------------------------------------------------------------
  */

  ipcMain.handle(
    'get-app-version',
    () => {
      return app.getVersion();
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Check for Updates
  |--------------------------------------------------------------------------
  */

  ipcMain.handle(
    'check-for-updates',
    async () => {
      return await checkForUpdates();
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Download Update
  |--------------------------------------------------------------------------
  */

  ipcMain.handle(
    'download-update',
    async () => {
      return await downloadUpdate();
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Install Update
  |--------------------------------------------------------------------------
  */

  ipcMain.handle(
    'install-update',
    () => {
      return installUpdate();
    }
  );
}

/*
|--------------------------------------------------------------------------
| Electron Ready
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
  /*
  |--------------------------------------------------------------------------
  | Create Application Window
  |--------------------------------------------------------------------------
  */

  createWindow();

  /*
  |--------------------------------------------------------------------------
  | Configure Auto Updater
  |--------------------------------------------------------------------------
  */

  configureAutoUpdater();

  /*
  |--------------------------------------------------------------------------
  | Register IPC
  |--------------------------------------------------------------------------
  */

  registerIPC();

  /*
  |--------------------------------------------------------------------------
  | macOS Activate
  |--------------------------------------------------------------------------
  */

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

/*
|--------------------------------------------------------------------------
| Close Application
|--------------------------------------------------------------------------
*/

app.on(
  'window-all-closed',
  () => {
    if (
      process.platform !== 'darwin'
    ) {
      app.quit();
    }
  }
);