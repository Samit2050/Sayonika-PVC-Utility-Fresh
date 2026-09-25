
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
  },

  getForceUpdateStatus: () => {
    return ipcRenderer.invoke('get-force-update-status');
  },

  checkForUpdates: () => {
    return ipcRenderer.invoke('check-for-updates');
  },

  downloadUpdate: () => {
    return ipcRenderer.invoke('download-update');
  },

  installUpdate: () => {
    return ipcRenderer.invoke('install-update');
  },

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
