import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  FolderOpen,
  Layers,
  Printer,
  FileCheck,
  HelpCircle,
  Sparkles,
  Mail,
  User,
  Sliders,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Radio,
  Cloud,
  Play,
  Square,
  Volume2,
  VolumeX,
  Download,
  Megaphone,
  Users,
  Wifi,
  Lock,
  Unlock,
  Globe,
  KeyRound,
  Cpu,
  Edit2,
  MessageSquare
} from 'lucide-react';

import { DocumentType } from '../types';
import { AuthSession } from '../utils/authService';
import { soundService, playCropSuccessSound } from '../utils/audioNotification';
import { OnlineStatsWidget } from './OnlineStatsWidget';
import { getActivePdfEngine } from '../utils/pdfHelper';

import {
  AppUpdateConfig,
  getLocalAppUpdateConfig,
  subscribeToAppUpdateConfig,
  saveAppUpdateConfig
} from '../utils/appUpdateService';

import { AppUpdateLinkEditorModal } from './AppUpdateLinkEditorModal';

import {
  NewsTickerConfig,
  getLocalNewsTickerConfig,
  subscribeToNewsTickerConfig
} from '../utils/newsTickerService';

import { NewsTickerBar } from './NewsTickerBar';

/*
|--------------------------------------------------------------------------
| Electron GitHub Auto Update
|--------------------------------------------------------------------------
*/

import { ElectronUpdateManager } from './ElectronUpdateManager';

/*
|--------------------------------------------------------------------------
| Header Props
|--------------------------------------------------------------------------
*/

interface HeaderProps {
  activeTab: 'editor' | 'batch' | 'print' | 'guide';
  setActiveTab: (tab: 'editor' | 'batch' | 'print' | 'guide') => void;
  batchCount: number;
  onOpenFileClick: () => void;
  onLoadSample: (type: DocumentType) => void;
  onOpenSampleModal: () => void;
  onOpenAbout: () => void;
  onOpenWelcomeBanner: () => void;
  onOpenCloudHub?: () => void;
  onOpenPdfiumModal?: () => void;
  currentUser?: AuthSession | null;
  onOpenAdminLogin?: () => void;
  onOpenUserManagement?: () => void;
  onOpenUserMessageModal?: () => void;
  onOpenAdminMessages?: () => void;
  unreadMessagesCount?: number;
  onOpenSubscriptionPayment?: () => void;
  onOpenBroadcastEditor?: () => void;
  hasActiveBroadcast?: boolean;
  publicAccessEnabled?: boolean;
  onTogglePublicAccess?: () => void;
  isTogglingPublicAccess?: boolean;
  onLogout?: () => void;
  onProcessAll?: () => void;
  onStopProcessing?: () => void;
  isProcessing?: boolean;
  onOpenEpsonPrint?: () => void;
}

/*
|--------------------------------------------------------------------------
| Header
|--------------------------------------------------------------------------
*/

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  batchCount,
  onOpenFileClick,
  onLoadSample,
  onOpenSampleModal,
  onOpenAbout,
  onOpenWelcomeBanner,
  onOpenCloudHub,
  onOpenPdfiumModal,
  currentUser,
  onOpenAdminLogin,
  onOpenUserManagement,
  onOpenUserMessageModal,
  onOpenAdminMessages,
  unreadMessagesCount,
  onOpenSubscriptionPayment,
  onOpenBroadcastEditor,
  hasActiveBroadcast = true,
  publicAccessEnabled = false,
  onTogglePublicAccess,
  isTogglingPublicAccess = false,
  onLogout,
  onProcessAll,
  onStopProcessing,
  isProcessing = false,
  onOpenEpsonPrint,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const isOperatorOrDev =
    !currentUser?.isPublicGuest &&
    (
      currentUser?.role === 'operator' ||
      currentUser?.role === 'admin' ||
      currentUser?.userId === 'samit' ||
      currentUser?.userId === 'admin' ||
      currentUser?.name?.toLowerCase().includes('admin') ||
      currentUser?.name?.toLowerCase().includes('developer') ||
      currentUser?.name?.toLowerCase().includes('biswas')
    );

  const isAdminOrDeveloper = isAdmin || isOperatorOrDev;

  const canEditUpdateLink = isAdminOrDeveloper;

  /*
  |--------------------------------------------------------------------------
  | Local UI State
  |--------------------------------------------------------------------------
  */

  const [isMuted, setIsMuted] = useState<boolean>(
    soundService.getIsMuted()
  );

  const [appUpdateConfig, setAppUpdateConfig] =
    useState<AppUpdateConfig>(
      getLocalAppUpdateConfig()
    );

  const [isUpdateModalOpen, setIsUpdateModalOpen] =
    useState<boolean>(false);

  const [newsTickerConfig, setNewsTickerConfig] =
    useState<NewsTickerConfig>(
      getLocalNewsTickerConfig()
    );

  const [isNewsTickerEditorOpen, setIsNewsTickerEditorOpen] =
    useState<boolean>(false);

  const currentEngine = getActivePdfEngine();

  /*
  |--------------------------------------------------------------------------
  | Live Sync with Firestore for App Update Link
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe = subscribeToAppUpdateConfig((cfg) => {
      if (cfg) {
        setAppUpdateConfig(cfg);
      }
    });

    return () => unsubscribe();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Live Sync with Firestore for News Ticker
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe = subscribeToNewsTickerConfig((cfg) => {
      if (cfg) {
        setNewsTickerConfig(cfg);
      }
    });

    return () => unsubscribe();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Sound Toggle
  |--------------------------------------------------------------------------
  */

  const handleToggleSound = () => {
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    soundService.setMuted(nextMuted);

    if (!nextMuted) {
      playCropSuccessSound();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RGB Glow Button Style
  |--------------------------------------------------------------------------
  */

  const getButtonGlowClass = () => {
    if (appUpdateConfig.rgbGlowEnabled === false) {
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 border-emerald-400/40';
    }

    switch (appUpdateConfig.rgbGlowStyle) {
      case 'cyberpunk':
        return 'rgb-glow-cyberpunk text-white shadow-lg';

      case 'neon-emerald':
        return 'rgb-glow-neon-emerald text-white shadow-lg';

      case 'fire':
        return 'rgb-glow-fire text-white shadow-lg';

      case 'rainbow':
      default:
        return 'rgb-glow-active text-white shadow-lg';
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Quick RGB Glow Toggle
  |--------------------------------------------------------------------------
  */

  const handleQuickToggleRgbGlow = async (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const nextGlow = !(
      appUpdateConfig.rgbGlowEnabled ?? true
    );

    const updater =
      `${currentUser?.name || 'Admin'} ` +
      `(${currentUser?.role?.toUpperCase() || 'ADMIN'})`;

    setAppUpdateConfig((prev) => ({
      ...prev,
      rgbGlowEnabled: nextGlow,
    }));

    await saveAppUpdateConfig(
      {
        ...appUpdateConfig,
        rgbGlowEnabled: nextGlow,
      },
      updater
    );

    playCropSuccessSound();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <header
      id="app-header"
      className="bg-slate-950/95 text-slate-100 border-b border-slate-800/80 select-none sticky top-0 z-40 backdrop-blur-md shadow-lg shadow-black/20"
    >
      {/* Top Windows PC styled titlebar */}

      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 border-b border-slate-900/90 text-xs bg-slate-950 flex-wrap gap-2">

        <div className="flex items-center gap-2.5">

          <div
            onClick={onOpenWelcomeBanner}
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md shadow-orange-500/20 ring-1 ring-amber-400/30 cursor-pointer hover:scale-105 transition"
            title="Open Welcome / Broadcast Banner"
          >
            <CreditCard className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2">

            <span
              onClick={onOpenWelcomeBanner}
              className="font-bold tracking-tight text-slate-100 text-sm cursor-pointer hover:text-amber-400 transition"
              title="Click to view Welcome / Broadcast Banner"
            >
              Sayonika PVC Utility
            </span>

            <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 text-[10px] font-mono font-medium tracking-wide">
              v2.5 CR80 PRO
            </span>

          </div>

          <span className="hidden lg:inline-block text-slate-700">
            |
          </span>

          <span className="hidden lg:inline-block text-slate-400 text-xs font-normal">
            Biswas Xerox Centre (Bara Andulia, Chapra, Nadia)
          </span>

        </div>

        {/* Developer attribution & Session / User Info */}

        <div className="flex items-center gap-2 flex-wrap">

          {/* Live Online Users & Visit Count Widget */}

          {isAdminOrDeveloper && (
            <OnlineStatsWidget
              isAdminOrDeveloper={isAdminOrDeveloper}
            />
          )}

          {/* Live Cloud Sync Status Pill */}

          {isAdminOrDeveloper && (
            <div
              id="cloud-sync-status-pill"
              className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-700/60 px-2.5 py-1 rounded-full text-[11px] text-emerald-300 shadow-sm"
              title="Firestore Live Cloud Sync is active and syncing in real-time"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <span className="font-semibold">
                Cloud Sync
              </span>

              <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded font-mono font-bold">
                LIVE
              </span>
            </div>
          )}

          {/* Cloud Presets Live Sync Hub Button */}

          {isAdminOrDeveloper && onOpenCloudHub && (
            <button
              id="cloud-presets-header-btn"
              onClick={onOpenCloudHub}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-800/70 text-[11px] font-semibold transition cursor-pointer shadow-sm"
              title="Cloud Presets (Permanently synced for all users)"
            >
              <Cloud className="w-3 h-3 text-cyan-400" />

              <span className="hidden sm:inline">
                Cloud Presets
              </span>
            </button>
          )}

          {/* Google PDFium WebAssembly Engine Studio */}

          {isAdminOrDeveloper && onOpenPdfiumModal && (
            <button
              id="pdfium-engine-header-btn"
              onClick={onOpenPdfiumModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-purple-950/90 hover:from-blue-900 hover:to-indigo-900 text-blue-300 hover:text-blue-100 border border-blue-600/50 text-[11px] font-semibold transition cursor-pointer shadow-md shadow-blue-950/40"
              title="Google PDFium WebAssembly Engine (Chromium Native C++ 600 DPI Rasterizer)"
            >
              <Cpu className="w-3 h-3 text-blue-400 animate-pulse" />

              <span className="font-bold text-white tracking-wide">
                PDFium
              </span>

              <span className="text-[9px] px-1 bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded font-mono font-bold">
                WASM
              </span>
            </button>
          )}

          {/* Admin: Enable / Disable Public Access */}

          {isAdmin && onTogglePublicAccess ? (
            <button
              id="toggle-public-access-header-btn"
              onClick={onTogglePublicAccess}
              disabled={isTogglingPublicAccess}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shadow-sm border ${
                publicAccessEnabled
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 border-emerald-500/50 shadow-emerald-950/40'
                  : 'bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-red-100 border-red-800/60 shadow-red-950/40'
              } disabled:opacity-50`}
              title={
                publicAccessEnabled
                  ? 'Public Access is currently ENABLED (Anyone can use without login). Click to DISABLE and enforce login.'
                  : 'Public Access is currently DISABLED (Strict login required). Click to ENABLE open access without login.'
              }
            >
              {isTogglingPublicAccess ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : publicAccessEnabled ? (
                <Unlock className="w-3 h-3 text-emerald-400" />
              ) : (
                <Lock className="w-3 h-3 text-red-400" />
              )}

              <span>
                {publicAccessEnabled
                  ? 'Public: Open'
                  : 'Public: Locked'}
              </span>

              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                  publicAccessEnabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {publicAccessEnabled
                  ? 'NO LOGIN'
                  : 'LOGIN REQ'}
              </span>
            </button>
          ) : (
            /* Non-admin view-only status pill */

            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                publicAccessEnabled
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title={
                publicAccessEnabled
                  ? 'Public access is enabled without login'
                  : 'Login protection is enforced'
              }
            >
              {publicAccessEnabled ? (
                <>
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span>Public Access Mode</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Protected Mode</span>
                </>
              )}
            </div>
          )}

          {/* Admin: Customize Pop-up Message */}

          {isAdmin && onOpenBroadcastEditor && (
            <button
              id="admin-broadcast-editor-btn"
              onClick={onOpenBroadcastEditor}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[11px] font-bold transition cursor-pointer shadow-sm"
              title="Customize Pop-up Message Box (Admin)"
            >
              <Megaphone className="w-3 h-3 text-amber-400" />
              <span>Customize Popup</span>
            </button>
          )}

          {/* Admin: User Management */}

          {isAdmin && onOpenUserManagement && (
            <button
              id="admin-user-mgmt-btn"
              onClick={onOpenUserManagement}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-blue-100 border border-blue-800 text-[11px] font-semibold transition cursor-pointer shadow-sm"
              title="Manage Authorized Users & Login Permissions"
            >
              <Users className="w-3 h-3 text-blue-400" />
              <span>User Access</span>
            </button>
          )}

          {/* Admin: User Messages Inbox */}

          {isAdmin && onOpenAdminMessages && (
            <button
              id="admin-messages-inbox-btn"
              onClick={onOpenAdminMessages}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 hover:bg-amber-900 text-amber-300 hover:text-amber-100 border border-amber-500/50 text-[11px] font-bold transition cursor-pointer shadow-sm relative"
              title="User Messages & Inquiries Inbox"
            >
              <MessageSquare className="w-3 h-3 text-amber-400" />

              <span>Messages</span>

              {typeof unreadMessagesCount === 'number' &&
              unreadMessagesCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold animate-pulse">
                  {unreadMessagesCount}
                </span>
              ) : null}
            </button>
          )}

          {/* Public Guest vs Logged-in User Controls */}

          {currentUser?.isPublicGuest ? (
            onOpenAdminLogin && (
              <button
                id="header-admin-signin-btn"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-blue-100 border border-blue-700/80 text-[11px] font-bold transition cursor-pointer shadow-sm active:scale-95"
                title="Sign in as Administrator or Operator to manage users & settings"
              >
                <KeyRound className="w-3 h-3 text-blue-400" />
                <span>Admin Sign In</span>
              </button>
            )
          ) : (
            currentUser && (
              <>
                <div
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-[11px] text-slate-300"
                  title={`Logged in as: ${currentUser.name} (${currentUser.role})`}
                >
                  <User className="w-3 h-3 text-blue-400" />

                  <span className="font-semibold text-white max-w-[110px] truncate">
                    {currentUser.name}
                  </span>

                  {isAdmin && (
                    <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-mono font-bold">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* Logout */}

                {onLogout && (
                  <button
                    id="logout-btn"
                    onClick={onLogout}
                    className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg border border-slate-800 hover:border-red-800/60 transition cursor-pointer text-[11px]"
                    title="Log out / Return to public access"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      Logout
                    </span>
                  </button>
                )}
              </>
            )
          )}

          {/* Subscription / Renew Plan */}

          {onOpenSubscriptionPayment && (
            <button
              id="header-subscription-btn"
              onClick={onOpenSubscriptionPayment}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[11px] font-bold transition cursor-pointer shadow-sm active:scale-95"
              title="View Subscription Plans or Renew via Instant UPI QR + UTR"
            >
              <CreditCard className="w-3 h-3 text-amber-400" />

              <span className="hidden sm:inline">
                💳 Plan / UPI Pay
              </span>

              <span className="sm:hidden">
                Pay UPI
              </span>
            </button>
          )}

          {/* Message to Admin */}

          {onOpenUserMessageModal && (
            <button
              id="header-message-admin-btn"
              onClick={onOpenUserMessageModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-300 hover:text-blue-100 border border-blue-500/40 text-[11px] font-bold transition cursor-pointer shadow-sm active:scale-95"
              title="Send a message, request a custom ID card, or get help directly from the Administrator"
            >
              <MessageSquare className="w-3 h-3 text-blue-400" />

              <span className="hidden sm:inline">
                💬 Message Admin
              </span>

              <span className="sm:hidden">
                Msg Admin
              </span>
            </button>
          )}

          {/* Popup / Welcome Button */}

          <button
            id="welcome-banner-header-btn"
            onClick={onOpenWelcomeBanner}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition cursor-pointer"
            title="Open Pop-up Announcement"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Notice</span>
          </button>

          {/* Sound Toggle */}

          <button
            id="sound-toggle-btn"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isMuted
                ? 'text-slate-500 hover:text-slate-300 bg-slate-900/60 border-slate-800'
                : 'text-amber-400 hover:text-amber-300 bg-amber-950/30 border-amber-500/40 hover:bg-amber-900/40'
            }`}
            title={
              isMuted
                ? 'Notification Sound: Muted (Click to enable completion chime)'
                : 'Notification Sound: Enabled (Click to mute)'
            }
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* About / Help */}

          <button
            id="about-app-btn"
            onClick={onOpenAbout}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50 transition cursor-pointer"
            title="Documentation, Keyboard Shortcuts & About"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Main navigation toolbar */}

      <div className="flex flex-col border-t border-slate-800/80">

        <div className="flex flex-wrap items-center justify-between px-4 py-2 gap-3 bg-slate-900/50">

          {/* Navigation Segmented Control */}

          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 shadow-inner">

            <button
              id="tab-editor"
              onClick={() => setActiveTab('editor')}
              className={`hidden px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>Interactive Editor</span>
            </button>

            <button
              id="tab-batch"
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'batch'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                  : 'text-red-400 hover:text-white hover:bg-red-600/80 bg-red-950/50 border border-red-800/70'
              }`}
            >
              <span className="font-bold tracking-wide">
                FILES
              </span>

              {batchCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-red-700 font-bold text-[10px] shadow-sm">
                  {batchCount}
                </span>
              )}
            </button>

            <button
              id="tab-print"
              onClick={() => setActiveTab('print')}
              className={`hidden px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'print'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>Print Imposition</span>
            </button>

            <button
              id="tab-guide"
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>Presets & Templates</span>
            </button>

          </nav>

          {/* Quick Actions */}

          <div className="flex items-center gap-2.5 flex-wrap">

            {/* Electron GitHub Auto Update */}

            <ElectronUpdateManager />

            {/* Existing Update App Button */}

            {appUpdateConfig.isEnabled !== false ||
            canEditUpdateLink ? (
              <div
                id="update-app-container"
                className={`relative flex items-center group/update-btn ${
                  appUpdateConfig.rgbGlowHalo &&
                  appUpdateConfig.rgbGlowEnabled !== false
                    ? 'rgb-glow-container-halo'
                    : ''
                }`}
              >

                <a
                  id="update-app-header-btn"
                  href={
                    appUpdateConfig.url ||
                    'https://drive.google.com/file/d/1vYMt9gSex2T65hQS_x6cPC6SC5R6Ah-l/view?usp=drive_link'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all transform active:scale-95 cursor-pointer border whitespace-nowrap ${getButtonGlowClass()}`}
                  title={
                    appUpdateConfig.tooltipText ||
                    'Download latest update / installer for PC (Google Drive)'
                  }
                >
                  <Download className="w-3.5 h-3.5 text-white animate-pulse" />

                  <span>
                    {appUpdateConfig.buttonLabel ||
                      'Update App'}
                  </span>

                  {appUpdateConfig.badgeText && (
                    <span className="px-1 py-0.2 rounded bg-black/40 text-white text-[9px] font-mono border border-white/40 font-bold backdrop-blur-sm">
                      {appUpdateConfig.badgeText}
                    </span>
                  )}
                </a>

                {/* Admin or Developer Action Buttons */}

                {canEditUpdateLink && (
                  <div className="flex items-center ml-1 gap-1">

                    {/* RGB Glow Toggle */}

                    <button
                      id="toggle-rgb-glow-btn"
                      type="button"
                      onClick={handleQuickToggleRgbGlow}
                      className={`p-1.5 rounded-lg transition shadow-sm cursor-pointer border ${
                        appUpdateConfig.rgbGlowEnabled !== false
                          ? 'bg-purple-950/90 hover:bg-purple-900 text-purple-300 hover:text-purple-100 border-purple-500/60 shadow-purple-500/30 ring-1 ring-purple-400/40 animate-pulse'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                      }`}
                      title={
                        appUpdateConfig.rgbGlowEnabled !== false
                          ? 'RGB Glow is ON (Click to turn OFF and live sync)'
                          : 'RGB Glow is OFF (Click to turn ON and live sync)'
                      }
                    >
                      <Sparkles className="w-3 h-3 text-purple-300" />
                    </button>

                    {/* Edit Link & RGB Customizer */}

                    <button
                      id="edit-update-app-link-btn"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsUpdateModalOpen(true);
                      }}
                      className="p-1.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 border border-emerald-500/50 hover:border-emerald-400 rounded-lg transition shadow-sm cursor-pointer"
                      title="Edit App Download Link, RGB Glow & Settings (Live Sync with Firestore)"
                    >
                      <Edit2 className="w-3 h-3 text-emerald-300" />
                    </button>

                  </div>
                )}

              </div>
            ) : null}

            {/* Primary Upload Button */}

            <button
              id="open-pdf-top-btn"
              onClick={onOpenFileClick}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/25 transition-all transform active:scale-95 cursor-pointer"
              title="Open PDF or Image files (Ctrl + O)"
            >
              <FolderOpen className="w-4 h-4" />

              <span>
                Open PDF / Files
              </span>
            </button>

            {/* Epson Photo+ ID Card Print Quick Action */}

            {onOpenEpsonPrint && (
              <button
                id="epson-top-direct-print-btn"
                onClick={onOpenEpsonPrint}
                className="hidden items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-slate-100 hover:text-white border border-blue-400/60 hover:border-blue-300 text-xs font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap group"
                title="Epson Photo+ ID Card Print (Same to Same Epson Photo+ PVC Tray Layout)"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 animate-pulse" />

                <span>
                  Epson Photo+ ID Card Print
                </span>

                <span className="px-1.5 py-0.2 bg-blue-500/30 text-blue-200 text-[9px] font-mono rounded border border-blue-400/40 font-black">
                  PHOTO+
                </span>
              </button>
            )}

            {/* Batch Auto-Crop All Button */}

            {onProcessAll && !isProcessing && (
              <button
                id="batch-process-all-btn"
                onClick={() => {
                  if (activeTab !== 'batch') {
                    setActiveTab('batch');
                  }

                  onProcessAll();
                }}
                disabled={batchCount === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-400 hover:via-orange-500 hover:to-orange-500 text-slate-950 text-xs font-black tracking-wide rounded-lg shadow-lg shadow-orange-500/30 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap border border-orange-400/50"
                title="Auto-Crop All Cards in Queue (600 DPI Ultra HD)"
              >
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />

                <span>
                  Auto-Crop All
                  {batchCount > 0
                    ? ` (${batchCount})`
                    : ''}
                </span>
              </button>
            )}

            {/* Stop Ongoing Cropping Button */}

            {isProcessing && onStopProcessing && (
              <button
                id="batch-stop-btn"
                onClick={onStopProcessing}
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black tracking-wide rounded-lg shadow-lg shadow-red-600/40 transition-all transform active:scale-95 cursor-pointer animate-pulse whitespace-nowrap border border-red-400/60 ring-2 ring-red-500/40"
                title="Stop ongoing card cropping immediately"
              >
                <Square className="w-3.5 h-3.5 fill-white text-white" />

                <span>
                  Stop Cropping
                </span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Scrolling News & Important Updates Bar */}

      <NewsTickerBar
        config={newsTickerConfig}
        canEdit={isAdminOrDeveloper}
        onOpenEditor={() =>
          setIsNewsTickerEditorOpen(true)
        }
      />

      {/* Admin / Developer App Update Link Editor Modal */}

      {canEditUpdateLink && (
        <AppUpdateLinkEditorModal
          isOpen={isUpdateModalOpen}
          onClose={() =>
            setIsUpdateModalOpen(false)
          }
          currentConfig={appUpdateConfig}
          userDisplayName={
            currentUser?.name || 'Admin'
          }
          userRole={
            currentUser?.role || 'admin'
          }
          onConfigSaved={(newCfg) =>
            setAppUpdateConfig(newCfg)
          }
        />
      )}

      {/* Admin Scrolling News & Updates Editor Modal */}

      {isAdminOrDeveloper && (
        <NewsTickerEditorModal
          isOpen={isNewsTickerEditorOpen}
          onClose={() =>
            setIsNewsTickerEditorOpen(false)
          }
          currentConfig={newsTickerConfig}
          userDisplayName={
            currentUser?.name || 'Admin'
          }
          onConfigSaved={(newCfg) =>
            setNewsTickerConfig(newCfg)
          }
        />
      )}

    </header>
  );
};