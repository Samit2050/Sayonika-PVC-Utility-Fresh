import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  Radio
} from 'lucide-react';

interface InternetConnectionGuardProps {
  children?: React.ReactNode;
}

export const InternetConnectionGuard: React.FC<InternetConnectionGuardProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showRestoredToast, setShowRestoredToast] = useState<boolean>(false);
  const [offlineDuration, setOfflineDuration] = useState<number>(0);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const timerRef = useRef<any>(null);
  const checkIntervalRef = useRef<any>(null);

  // Probe actual connectivity via lightweight request with timeout
  const checkRealConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Perform cache-busted fetch to test real HTTP roundtrip
      const testUrl = `${window.location.origin}/favicon.ico?_ping=${Date.now()}`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true;
    } catch (err: any) {
      // If abort or network failed, try fallback public endpoint or evaluate navigator
      if (typeof navigator !== 'undefined') {
        return navigator.onLine;
      }
      return false;
    }
  }, []);

  const runLiveCheck = useCallback(async () => {
    setIsChecking(true);
    setLastCheckTime(new Date());
    const online = await checkRealConnection();
    setIsChecking(false);

    setIsOnline((prevOnline) => {
      if (!prevOnline && online) {
        // Connection just restored!
        setShowRestoredToast(true);
        setTimeout(() => setShowRestoredToast(false), 4000);
      }
      return online;
    });
  }, [checkRealConnection]);

  // Window event listeners & polling
  useEffect(() => {
    const handleOnlineEvent = async () => {
      await runLiveCheck();
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      setOfflineDuration(0);
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    // Initial check on mount
    runLiveCheck();

    // Periodic check loop
    checkIntervalRef.current = setInterval(() => {
      // Check every 3 seconds if offline, or every 20 seconds if online
      runLiveCheck();
    }, isOnline ? 20000 : 3500);

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isOnline, runLiveCheck]);

  // Offline duration counter
  useEffect(() => {
    if (!isOnline) {
      timerRef.current = setInterval(() => {
        setOfflineDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setOfflineDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOnline]);

  return (
    <>
      {/* Main App Content */}
      {children}

      {/* Restored Connection Toast Notification */}
      {showRestoredToast && (
        <div 
          id="internet-restored-toast"
          className="fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 bg-emerald-950/95 border border-emerald-500/80 text-emerald-100 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in ring-1 ring-emerald-400/40"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Internet Connection Restored</h4>
            <p className="text-[11px] text-emerald-300/90">You are back online. All features are fully active.</p>
          </div>
        </div>
      )}

      {/* Unclosable Internet Required Blocking Popup Modal */}
      {!isOnline && (
        <div 
          id="internet-required-modal-overlay"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in"
        >
          <div 
            id="internet-required-modal-box"
            className="relative w-full max-w-md bg-slate-900 border-2 border-red-500/60 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden ring-1 ring-red-400/30"
          >
            {/* Red Accent Top Glow Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

            {/* Modal Body */}
            <div className="p-6 text-center space-y-4">
              
              {/* Pulsing WifiOff Icon */}
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-red-600/20 animate-ping opacity-75" />
                <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500/20 to-red-950/80 border-2 border-red-500/50 flex items-center justify-center text-red-400 shadow-inner">
                  <WifiOff className="w-8 h-8" />
                </div>
              </div>

              {/* Title & Warning */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-950/80 border border-red-600/40 text-[11px] font-mono font-bold text-red-300 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>MANDATORY REQUIREMENT</span>
                </div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Internet Connection Required
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  Active internet connection is strictly required to run <span className="font-semibold text-white">Sayonika PVC Utility</span>. 
                  Card generation, printing, and cloud syncing are temporarily paused.
                </p>
              </div>

              {/* Live Status Diagnostics Box */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    Connection Status:
                  </span>
                  <span className="font-bold text-red-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Disconnected ({offlineDuration}s)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Auto Live Probe:</span>
                  <span className="font-mono text-[11px] text-blue-400 flex items-center gap-1">
                    {isChecking ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                        <span className="text-amber-300">Pinging network...</span>
                      </>
                    ) : (
                      <span>Checking every 3s</span>
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Troubleshooting Steps:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                    <li>Check Wi-Fi switch or Ethernet network cable</li>
                    <li>Ensure mobile hotspot or broadband router is active</li>
                    <li>Verify browser network permission and proxy settings</li>
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={runLiveCheck}
                  disabled={isChecking}
                  className="w-full py-3 px-4 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Verifying Live Internet...' : 'Retry Connection Check Now'}</span>
                </button>
              </div>

              {/* Auto Resume Notice */}
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Globe className="w-3 h-3 text-slate-500" />
                <span>This window will dismiss automatically as soon as internet is detected.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
