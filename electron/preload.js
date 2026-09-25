import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  /**
   * Get the currently installed application version.
   */
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
  },

  /**
   * Check GitHub for a newer application version.
   */
  checkForUpdates: () => {
    return ipcRenderer.invoke('check-for-updates');
  },

  /**
   * Download the available update.
   */
  downloadUpdate: () => {
    return ipcRenderer.invoke('download-update');
  },

  /**
   * Install the downloaded update and restart the application.
   */
  installUpdate: () => {
    return ipcRenderer.invoke('install-update');
  },

  /**
   * Listen for update status events from the Electron main process.
   *
   * Returns a cleanup function that removes the listener.
   */
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, data) => {
      callback(data);
    };

    ipcRenderer.on('update-status', listener);

    return () => {
      ipcRenderer.removeListener('update-status', listener);
    };
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);