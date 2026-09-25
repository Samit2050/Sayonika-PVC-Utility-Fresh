
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
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

  saveFileToCroppedFolder: (fileName, data) => {
    return ipcRenderer.invoke('save-file-to-cropped-folder', {
      fileName,
      data
    });
  },

  openCroppedFolder: () => {
    return ipcRenderer.invoke('open-cropped-folder');
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
