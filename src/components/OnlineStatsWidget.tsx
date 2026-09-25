import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Eye, 
  Activity, 
  Globe, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Laptop,
  Smartphone,
  ShieldCheck,
  Server
} from 'lucide-react';
import { presenceService, PresenceStats } from '../utils/presenceService';

interface OnlineStatsWidgetProps {
  className?: string;
  onOpenDetailedModal?: () => void;
  isAdminOrDeveloper?: boolean;
}

export const OnlineStatsWidget: React.FC<OnlineStatsWidgetProps> = ({ 
  className = '',
  isAdminOrDeveloper = true,
}) => {
  const [stats, setStats] = useState<PresenceStats>(presenceService.getStats());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to real-time presence & visit count updates
    const unsubscribe = presenceService.subscribe((newStats) => {
      setStats(newStats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await presenceService.sendHeartbeat();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (!isAdminOrDeveloper) {
    return null;
  }

  const formattedVisits = (stats.totalVisits || 1).toLocaleString('en-US');
  const onlineCount = Math.max(1, stats.onlineUsersCount || 1);

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={popoverRef}>
      {/* 1. Live Users Online Pill */}
      <button
        id="live-online-users-badge"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 hover:text-emerald-100 border border-emerald-800/70 hover:border-emerald-600 transition-all text-[11px] font-semibold cursor-pointer shadow-sm active:scale-95"
        title="Click to view live active users and online status"
      >
        {/* Pulsing Live Beacon Dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Users className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="tabular-nums font-bold tracking-tight text-emerald-200">
          {onlineCount} {onlineCount === 1 ? 'Online' : 'Online'}
        </span>
      </button>

      {/* 2. Total Visits Counter Pill */}
      <button
        id="total-visits-count-badge"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 hover:text-cyan-100 border border-cyan-800/70 hover:border-cyan-600 transition-all text-[11px] font-semibold cursor-pointer shadow-sm active:scale-95"
        title="Total application visits count"
      >
        <Eye className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="tabular-nums font-bold text-cyan-200">
          {formattedVisits} <span className="text-[10px] font-normal text-cyan-400/80">Visits</span>
        </span>
      </button>

      {/* 3. Detailed Stats Popover Flyout */}
      {isOpen && (
        <div 
          id="online-presence-flyout"
          className="absolute top-full right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 tracking-tight">Live Network & Analytics</h4>
                <p className="text-[10px] text-slate-400">Real-time presence & traffic</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Live Online Box */}
            <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-800/60 rounded-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Users Online</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-300 tabular-nums">
                {onlineCount}
              </div>
              <p className="text-[9px] text-emerald-400/80 mt-0.5">Active right now</p>
            </div>

            {/* Total Visits Box */}
            <div className="p-3 bg-gradient-to-br from-cyan-950/60 to-slate-950 border border-cyan-800/60 rounded-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400">Total Visits</span>
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-300 tabular-nums">
                {formattedVisits}
              </div>
              <p className="text-[9px] text-cyan-400/80 mt-0.5">Lifetime sessions</p>
            </div>
          </div>

          {/* Active Sessions Mini-List */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 px-1">
              <span>Active Connected Terminals ({onlineCount})</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> Live Sync
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {(stats?.activeSessions || []).length > 0 ? (
                (stats?.activeSessions || []).map((sess, idx) => (
                  <div 
                    key={sess.sessionId || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      {sess.device.includes('Android') || sess.device.includes('iOS') ? (
                        <Smartphone className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-blue-400" />
                      )}
                      <span className="font-medium text-slate-200 truncate max-w-[120px]">
                        {sess.userName || 'Operator'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">
                      {sess.device}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px]">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-3 h-3 text-emerald-400" />
                    <span className="font-medium text-slate-200">Current Terminal</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400">Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Status & Sync Footer */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Cloud Firestore Connected</span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[10px] font-medium transition cursor-pointer disabled:opacity-50"
              title="Ping Cloud Server"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Ping</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
