
interface UpdateInfo {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'download-started'
    | 'downloading'
    | 'downloaded'
    | 'installing'
    | 'error'
    | 'dev-mode';

  version?: string;
  releaseDate?: string | null;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
}

interface SaveFileResult {
  success: boolean;
  filePath?: string;
  message?: string;
}

interface OpenFolderResult {
  success: boolean;
  message?: string;
}

interface ElectronAPI {
  getAppVersion: () => Promise<string>;

  checkForUpdates: () => Promise<{
    success: boolean;
    message?: string;
  }>;

  downloadUpdate: () => Promise<{
    success: boolean;
    message?: string;
  }>;

  installUpdate: () => Promise<{
    success: boolean;
    message?: string;
  }>;

  saveFileToCroppedFolder: (
    fileName: string,
    data: Uint8Array | number[] | ArrayBuffer
  ) => Promise<SaveFileResult>;

  openCroppedFolder: () => Promise<OpenFolderResult>;

  onUpdateStatus: (
    callback: (data: UpdateInfo) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
