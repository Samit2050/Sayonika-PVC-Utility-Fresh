import React, { useEffect, useRef, useState } from 'react';

interface UpdateStatus {
  status: string;
  version?: string;
  releaseDate?: string | null;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
}

export const ElectronUpdateManager: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('');
  const [status, setStatus] = useState<string>('idle');
  const [availableVersion, setAvailableVersion] = useState<string>('');
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const autoCloseTimerRef = useRef<number | null>(null);

  const isElectron =
    typeof window !== 'undefined' &&
    !!window.electronAPI;

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  const closePopup = () => {
    clearAutoCloseTimer();
    setIsOpen(false);
    setStatus('idle');
    setErrorMessage('');
    setDownloadPercent(0);
  };

  const startAutoCloseTimer = () => {
    clearAutoCloseTimer();

    autoCloseTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setStatus('idle');
      setErrorMessage('');
      setDownloadPercent(0);
      autoCloseTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    if (!isElectron) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const initialize = async () => {
      try {
        const version = await window.electronAPI.getAppVersion();
        setAppVersion(version);
      } catch (error) {
        console.error('Failed to get application version:', error);
      }

      cleanup = window.electronAPI.onUpdateStatus(
        (data: UpdateStatus) => {
          setStatus(data.status);

          if (data.version) {
            setAvailableVersion(data.version);
          }

          if (typeof data.percent === 'number') {
            setDownloadPercent(data.percent);
          }

          if (data.message) {
            setErrorMessage(data.message);
          }

          if (data.status !== 'error') {
            setErrorMessage('');
          }

          /*
           * When GitHub confirms that the installed version
           * is already the latest version, automatically close
           * the update popup after 5 seconds.
           */
          if (data.status === 'not-available') {
            startAutoCloseTimer();
          } else {
            clearAutoCloseTimer();
          }
        }
      );
    };

    initialize();

    return () => {
      cleanup?.();
      clearAutoCloseTimer();
    };
  }, [isElectron]);

  if (!isElectron) {
    return null;
  }

  const handleOpenUpdateWindow = () => {
    clearAutoCloseTimer();
    setIsOpen(true);
  };

  const handleCheckForUpdates = async () => {
    clearAutoCloseTimer();

    setErrorMessage('');
    setStatus('checking');

    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      setStatus('error');

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to check for updates.'
      );
    }
  };

  const handleDownloadUpdate = async () => {
    clearAutoCloseTimer();

    setErrorMessage('');
    setDownloadPercent(0);
    setStatus('download-started');

    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      setStatus('error');

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to download update.'
      );
    }
  };

  const handleInstallUpdate = async () => {
    clearAutoCloseTimer();

    setStatus('installing');

    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      setStatus('error');

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to install update.'
      );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking for updates...';

      case 'available':
        return `Update available: v${availableVersion}`;

      case 'download-started':
        return 'Starting download...';

      case 'downloading':
        return `Downloading update... ${downloadPercent.toFixed(0)}%`;

      case 'downloaded':
        return `Update v${availableVersion} downloaded successfully.`;

      case 'installing':
        return 'Installing update and restarting...';

      case 'not-available':
        return 'You are using the latest version.';

      case 'dev-mode':
        return 'Update checking is available only in the installed app.';

      case 'error':
        return errorMessage || 'Update error occurred.';

      default:
        return '';
    }
  };

  const showDownloadButton = status === 'available';
  const showInstallButton = status === 'downloaded';

  const isBusy =
    status === 'checking' ||
    status === 'download-started' ||
    status === 'downloading' ||
    status === 'installing';

  return (
    <>
      <button
        type="button"
        onClick={handleOpenUpdateWindow}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
        title={`Sayonika PVC Utility v${appVersion}`}
      >
        Update
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[420px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">

            <div className="px-5 py-4 border-b border-slate-700">
              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-bold">
                    Sayonika PVC Utility
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Installed Version: v{appVersion || '...'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePopup}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xl transition"
                  title="Close"
                >
                  ×
                </button>

              </div>
            </div>

            <div className="p-5">

              {status === 'idle' && (
                <p className="text-sm text-slate-300">
                  Check GitHub for the latest version of the application.
                </p>
              )}

              {status === 'available' && (
                <div className="rounded-lg bg-blue-950/60 border border-blue-800 p-4">
                  <p className="font-semibold text-blue-300">
                    New version available
                  </p>

                  <p className="text-sm text-slate-300 mt-1">
                    Version: v{availableVersion}
                  </p>
                </div>
              )}

              {status === 'downloading' && (
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>Downloading update</span>

                    <span>
                      {downloadPercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, downloadPercent)
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {status === 'downloaded' && (
                <div className="rounded-lg bg-emerald-950/60 border border-emerald-800 p-4">
                  <p className="font-semibold text-emerald-300">
                    Update ready
                  </p>

                  <p className="text-sm text-slate-300 mt-1">
                    The update has been downloaded and is ready to install.
                  </p>
                </div>
              )}

              {status === 'not-available' && (
                <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
                  <p className="font-semibold text-emerald-300">
                    Application is up to date
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    Current version: v{appVersion}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    This window will close automatically in 5 seconds.
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="rounded-lg bg-red-950/60 border border-red-800 p-4">
                  <p className="font-semibold text-red-300">
                    Update Error
                  </p>

                  <p className="text-sm text-red-200 mt-1 break-words">
                    {errorMessage}
                  </p>
                </div>
              )}

              {isBusy && status !== 'downloading' && (
                <div className="flex items-center gap-3 mt-4 text-sm text-slate-300">

                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />

                  <span>
                    {getStatusText()}
                  </span>

                </div>
              )}

              {!isBusy &&
                status !== 'idle' &&
                status !== 'downloading' &&
                status !== 'not-available' && (
                  <p className="text-sm text-slate-300 mt-4">
                    {getStatusText()}
                  </p>
                )}

              <div className="flex justify-end gap-2 mt-6">

                {showDownloadButton && (
                  <button
                    type="button"
                    onClick={handleDownloadUpdate}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
                  >
                    Download Update
                  </button>
                )}

                {showInstallButton && (
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
                  >
                    Restart & Install
                  </button>
                )}

                {status !== 'downloading' &&
                  status !== 'installing' &&
                  !showDownloadButton &&
                  !showInstallButton &&
                  status !== 'not-available' && (
                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
                    >
                      Check for Updates
                    </button>
                  )}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};