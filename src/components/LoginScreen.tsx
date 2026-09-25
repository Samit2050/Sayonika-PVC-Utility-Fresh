import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  LogIn, 
  ShieldCheck, 
  User, 
  KeyRound, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Phone, 
  UserPlus, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Unlock,
  CreditCard,
  Send,
  Clock,
  QrCode,
  Zap,
  Check,
  Laptop,
  Copy,
  ShieldAlert
} from 'lucide-react';
import { 
  authenticateUser, 
  registerSelfUser,
  normalizeUserId, 
  AuthSession,
  GUEST_PUBLIC_SESSION,
  SystemSecurityConfig,
  DEFAULT_SECURITY_CONFIG,
  subscribeToSecurityConfig
} from '../utils/authService';
import { getDeviceHardwareInfo, DeviceHardwareInfo } from '../utils/deviceIdentifier';
import { SubscriptionPaymentModal } from './SubscriptionPaymentModal';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
  initialError?: string | null;
  publicAccessEnabled?: boolean;
  onEnterAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess,
  initialError,
  publicAccessEnabled = false,
  onEnterAsGuest
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form State
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isPcBindingMismatch, setIsPcBindingMismatch] = useState(false);
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [boundMacForError, setBoundMacForError] = useState<string | null>(null);
  const [currentMacForError, setCurrentMacForError] = useState<string | null>(null);
  const [localHardware, setLocalHardware] = useState<DeviceHardwareInfo | null>(null);
  const [copiedLocalMac, setCopiedLocalMac] = useState(false);

  // Self Registration Form State
  const [regMobile, setRegMobile] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccessUser, setRegSuccessUser] = useState<{
    userId: string;
    name: string;
    boundHardwareId?: string;
    subscriptionExpiresAt?: number;
    password?: string;
  } | null>(null);

  // Live System Security & Telegram Contact Configuration
  const [securityConfig, setSecurityConfig] = useState<SystemSecurityConfig>(DEFAULT_SECURITY_CONFIG);

  // UPI Subscription Payment Modal State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [prefillUserId, setPrefillUserId] = useState('');
  const [prefillUserName, setPrefillUserName] = useState('');

  useEffect(() => {
    getDeviceHardwareInfo().then((info) => {
      setLocalHardware(info);
    }).catch(console.error);

    const unsub = subscribeToSecurityConfig((cfg) => {
      setSecurityConfig(cfg);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  const copyLocalMacToClipboard = async (mac: string) => {
    try {
      await navigator.clipboard.writeText(mac);
      setCopiedLocalMac(true);
      setTimeout(() => setCopiedLocalMac(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleGuestEntry = () => {
    if (onEnterAsGuest) {
      onEnterAsGuest();
    } else {
      onLoginSuccess(GUEST_PUBLIC_SESSION);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPendingApproval(false);
    setIsExpired(false);
    setIsPcBindingMismatch(false);
    setIsDeviceBlocked(false);
    setBoundMacForError(null);
    setCurrentMacForError(null);

    const cleanId = normalizeUserId(userId);
    if (!cleanId) {
      setErrorMessage('Please enter your Mobile Number or Username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    const result = await authenticateUser(cleanId, password);
    setIsLoading(false);

    if (result.success && result.session) {
      onLoginSuccess(result.session);
    } else {
      setErrorMessage(result.error || 'Authentication failed.');
      if (result.isPendingApproval) {
        setIsPendingApproval(true);
        setPrefillUserId(cleanId);
      }
      if (result.isExpired) {
        setIsExpired(true);
        setPrefillUserId(cleanId);
      }
      if (result.isPcBindingMismatch) {
        setIsPcBindingMismatch(true);
        setBoundMacForError(result.boundHardwareId || null);
        setCurrentMacForError(result.currentHardwareId || localHardware?.macAddress || null);
      }
      if (result.isDeviceBlocked) {
        setIsDeviceBlocked(true);
        setCurrentMacForError(result.currentHardwareId || localHardware?.macAddress || null);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanDigits = (regMobile || '').replace(/\D/g, '');
    if ((cleanDigits?.length || 0) < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!regName || !regName.trim()) {
      setErrorMessage('Please enter your name or shop name.');
      return;
    }

    if (!regPassword || (regPassword?.length || 0) < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please retype carefully.');
      return;
    }

    setIsLoading(true);
    const res = await registerSelfUser({
      mobileNumber: cleanDigits,
      name: regName.trim(),
      password: regPassword,
    });
    setIsLoading(false);

    if (res.success && res.user) {
      setRegSuccessUser({
        userId: res.user.userId,
        name: res.user.name,
        boundHardwareId: res.user.boundHardwareId,
        subscriptionExpiresAt: res.user.subscriptionExpiresAt,
        password: regPassword,
      });
      setPrefillUserId(res.user.userId);
      setPrefillUserName(res.user.name);
      setUserId(res.user.userId);
      setPassword(regPassword);
      setRegMobile('');
      setRegName('');
      setRegPassword('');
      setRegConfirmPassword('');
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const handleImmediateLoginAfterReg = async () => {
    if (!regSuccessUser) return;
    setIsLoading(true);
    setErrorMessage(null);
    const authRes = await authenticateUser(regSuccessUser.userId, regSuccessUser.password || password);
    setIsLoading(false);
    if (authRes.success && authRes.session) {
      onLoginSuccess(authRes.session);
    } else {
      setUserId(regSuccessUser.userId);
      setRegSuccessUser(null);
      setActiveTab('login');
      if (authRes.error) {
        setErrorMessage(authRes.error);
      }
    }
  };

  const openPaymentModalWithPrefill = (uid?: string, uname?: string) => {
    setPrefillUserId(uid || userId || '');
    setPrefillUserName(uname || '');
    setIsSubscriptionModalOpen(true);
  };

  const telegramUrl = securityConfig.telegramLink?.trim() || 'https://t.me/BiswasXerox';
  const telegramBtnText = securityConfig.telegramButtonText?.trim() || 'Contact Admin on Telegram';
  const contactNotice = securityConfig.adminContactMessage?.trim() || 'To activate your account, get subscriptions, or report issues, contact Administrator directly on Telegram.';

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between items-center relative overflow-hidden select-none p-4 sm:p-6 text-slate-100 font-sans">
      {/* Background ambient lighting effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-950/20 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 z-10 border-b border-slate-850">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-orange-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{securityConfig.shopName || 'Sayonika PVC Utility'}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 text-[10px] font-mono font-bold">
                CR80 PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Biswas Xerox Centre • Bara Andulia, Chapra</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Pay / Subscription Button */}
          <button
            type="button"
            onClick={() => openPaymentModalWithPrefill()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-1.5 active:scale-95 transition cursor-pointer border border-amber-400/40"
            title="Scan UPI QR and Submit UTR for instant subscription activation"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">💳 Pay via UPI QR</span>
            <span className="sm:hidden">Pay UPI</span>
          </button>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium transition ${
            publicAccessEnabled
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}>
            {publicAccessEnabled ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Public: OPEN</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Security Active</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Center Login / Registration Card */}
      <main className="w-full max-w-lg my-auto py-6 z-10 animate-fade-in">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">
          
          {/* Top Switcher: Sign In vs Self Registration */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setRegSuccessUser(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Operator Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setRegSuccessUser(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Self Registration</span>
            </button>
          </div>

          {/* Header Banner */}
          <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/50 text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-2.5 shadow-inner ${
              activeTab === 'register'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : publicAccessEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-blue-600/10 text-blue-400 border-blue-500/20'
            }`}>
              {activeTab === 'register' ? (
                <UserPlus className="w-6 h-6" />
              ) : publicAccessEnabled ? (
                <Unlock className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>

            <h1 className="text-base font-bold text-white tracking-tight">
              {activeTab === 'register' 
                ? 'New Operator Self-Registration' 
                : publicAccessEnabled 
                ? 'Sayonika PVC Utility Access' 
                : 'Operator Sign In'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'register'
                ? 'Register with your 10-digit Mobile Number. Submit UPI payment with UTR for instant subscription activation!'
                : 'Log in with your Mobile Number or Username. Single-session protection enabled.'}
            </p>
          </div>

          {/* Direct Public Access Banner (If Enabled) */}
          {publicAccessEnabled && activeTab === 'login' && (
            <div className="p-5 pb-2 bg-gradient-to-b from-emerald-950/30 to-transparent border-b border-emerald-900/30">
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Public Access Mode is Active!</span>
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  Open access is enabled. You can enter directly without logging in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGuestEntry}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Enter App with Direct Public Access</span>
                <ArrowRight className="w-4 h-4 text-emerald-200 ml-1" />
              </button>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  OR Log in with Account
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          {/* Registration Success View */}
          {regSuccessUser && (
            <div className="p-6 space-y-4 animate-fade-in">
              <div className="p-5 bg-gradient-to-br from-emerald-950/90 via-slate-900 to-emerald-950/80 border border-emerald-500/60 rounded-2xl text-center space-y-3 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold tracking-wide uppercase inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Auto-Approved • No Waiting</span>
                  </span>
                  <h3 className="text-base font-bold text-white pt-1">Welcome, {regSuccessUser.name}!</h3>
                  <div className="text-xs text-emerald-300 font-mono bg-emerald-900/50 py-1 px-3 rounded-lg inline-block border border-emerald-800/80">
                    User ID (Mobile): <strong className="text-white">{regSuccessUser.userId}</strong>
                  </div>
                </div>

                {/* 10-Day Free Trial Banner */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>🎁 10-Day Free Trial Activated Automatically!</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Enjoy unrestricted, full-featured access for the next 10 days
                    {regSuccessUser.subscriptionExpiresAt ? ` (until ${new Date(regSuccessUser.subscriptionExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}.
                    After 10 days, an active subscription is required to continue.
                  </p>
                </div>

                {/* Device Hardware Binding Info */}
                {regSuccessUser.boundHardwareId && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-left space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <Laptop className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>🔒 Bound to This PC / Device</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      MAC / Hardware ID: <span className="text-cyan-200 font-bold">{regSuccessUser.boundHardwareId}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Your account is bound to this computer. For security, logins are permitted only from this registered machine.
                    </p>
                  </div>
                )}

                {/* Immediate Login CTA */}
                <button
                  type="button"
                  onClick={handleImmediateLoginAfterReg}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer border border-emerald-400/40"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opening App...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Start Using App Now (10-Day Free Trial)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Subscription Plans Notice */}
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Subscription & Renewal Info</span>
                  <button
                    type="button"
                    onClick={() => openPaymentModalWithPrefill(regSuccessUser.userId, regSuccessUser.name)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                  >
                    View UPI Plans
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your 10 days of free trial are ready to go! To continue after the trial or subscribe permanently, contact Admin or pay via UPI QR.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserId(regSuccessUser.userId);
                  setRegSuccessUser(null);
                  setActiveTab('login');
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Go to Operator Sign In Form</span>
              </button>
            </div>
          )}

          {/* Active Tab 1: Operator Sign In Form */}
          {activeTab === 'login' && !regSuccessUser && (
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              
              {/* Error Notification Alert */}
              {errorMessage && (
                <div className="p-3.5 bg-red-950/80 border border-red-800/80 rounded-xl text-xs text-red-300 space-y-2.5 shadow-md animate-shake">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed font-medium">{errorMessage}</div>
                  </div>

                  {/* If user is pending approval or subscription expired, show instant UPI pay button + Telegram button */}
                  {(isPendingApproval || isExpired) && (
                    <div className="pt-2 border-t border-red-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openPaymentModalWithPrefill(userId)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pay UPI & Submit UTR</span>
                      </button>

                      <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Message on Telegram</span>
                      </a>
                    </div>
                  )}

                  {/* PC Hardware Binding Mismatch Alert Box */}
                  {isPcBindingMismatch && (
                    <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-lg space-y-2 text-[11px]">
                      <div className="flex items-center gap-2 text-red-200 font-bold">
                        <Laptop className="w-4 h-4 text-amber-400" />
                        <span>PC Hardware Security Lock Triggered</span>
                      </div>
                      <p className="text-slate-300 leading-normal">
                        This user account is tied to a specific computer. Login from this machine was rejected because the hardware ID does not match.
                      </p>
                      <div className="space-y-1 font-mono text-[11px] bg-black/40 p-2 rounded border border-red-900/50">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Authorized PC MAC:</span>
                          <span className="text-emerald-300 font-bold">{boundMacForError || 'Registered PC'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Current PC MAC:</span>
                          <span className="text-amber-300 font-bold">{currentMacForError || localHardware?.macAddress || 'Detecting...'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {currentMacForError && (
                          <button
                            type="button"
                            onClick={() => copyLocalMacToClipboard(currentMacForError)}
                            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded border border-slate-700 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedLocalMac ? 'Copied Current MAC!' : 'Copy Current MAC'}</span>
                          </button>
                        )}
                        <a
                          href={`${telegramUrl}?text=${encodeURIComponent(`Hello Admin, my user ID is @${userId}. Please update my registered PC MAC binding to: ${currentMacForError || localHardware?.macAddress}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded flex items-center justify-center gap-1 text-[11px] font-bold shadow cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Request Re-bind</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Hardware Device Blocked Alert Box */}
                  {isDeviceBlocked && (
                    <div className="p-3 bg-rose-950/60 border border-rose-600/70 rounded-lg space-y-2 text-[11px] shadow-lg animate-fade-in">
                      <div className="flex items-center gap-2 text-rose-200 font-bold">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>⛔ Device Hardware Blocked / Blacklisted</span>
                      </div>
                      <p className="text-slate-300 leading-normal">
                        Access from this computer has been prohibited by the Administrator. This machine's hardware signature (MAC) is blacklisted.
                      </p>
                      <div className="space-y-1 font-mono text-[11px] bg-black/60 p-2 rounded border border-rose-900/50">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Blocked PC MAC:</span>
                          <span className="text-rose-300 font-bold">{currentMacForError || localHardware?.macAddress || 'Detecting...'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {currentMacForError && (
                          <button
                            type="button"
                            onClick={() => copyLocalMacToClipboard(currentMacForError)}
                            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded border border-slate-700 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedLocalMac ? 'Copied Blocked MAC!' : 'Copy Blocked MAC'}</span>
                          </button>
                        )}
                        <a
                          href={`${telegramUrl}?text=${encodeURIComponent(`Hello Admin, my computer MAC ${currentMacForError || localHardware?.macAddress} has been blocked. Please assist.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded flex items-center justify-center gap-1 text-[11px] font-bold shadow cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Contact Support</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User ID Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Mobile Number / User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter 10-digit mobile or ID (e.g. samit)"
                    required
                    autoFocus={!publicAccessEnabled}
                    className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials & Session...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to PVC Print Studio</span>
                  </>
                )}
              </button>

              {/* Quick Subscription Payment Bar */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-200">Need plan or renewal?</span>
                </div>
                <button
                  type="button"
                  onClick={() => openPaymentModalWithPrefill(userId)}
                  className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                >
                  Pay via UPI QR
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>New Operator?</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2 transition"
                >
                  Register Account Here →
                </button>
              </div>
            </form>
          )}

          {/* Active Tab 2: Self Registration Form */}
          {activeTab === 'register' && !regSuccessUser && (
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Mobile Number (User ID) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>10-Digit Mobile Number (Your User ID) *</span>
                  <span className="text-[10px] text-amber-400 font-normal">Used as Login UID</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 transition outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* Name / Shop Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Operator Name / Shop Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Sujit Biswas (Biswas Xerox)"
                    required
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 transition outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Create Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="text-[10px] text-amber-400 hover:text-amber-300"
                    >
                      {showRegPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    required
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 transition outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Confirm Password *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 transition outline-none font-medium"
                  />
                </div>
              </div>

              {/* Auto-Approval & 10-Day Free Trial Notice */}
              <div className="p-3 bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/60 border border-amber-500/40 rounded-xl text-[11px] text-amber-200/90 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant Auto-Approval • 10-Day Free Trial</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  • No waiting for admin approval — your account activates immediately!<br />
                  • Comes with a complimentary <strong>10-Day Free Trial</strong>.<br />
                  • Your account is automatically locked to this PC (Device MAC) for secure access.
                </p>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-amber-600 to-orange-600 hover:from-emerald-500 hover:to-orange-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Account & Free Trial...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Register & Start 10-Day Free Trial</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  Already have an account? <strong>Sign In</strong>
                </button>
              </div>
            </form>
          )}

          {/* Admin Telegram Contact Box & Button */}
          <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
            <div className="p-3 bg-gradient-to-r from-sky-950/60 via-slate-900 to-blue-950/60 rounded-xl border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Admin Contact & Support</span>
                </div>
                {securityConfig.telegramUsername && (
                  <span className="text-[10px] font-mono text-sky-400/80 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                    {securityConfig.telegramUsername}
                  </span>
                )}
              </div>

              {/* Customizable Message Box */}
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {contactNotice}
              </p>

              {/* Telegram Link Button */}
              <a
                id="admin-telegram-contact-btn"
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-sky-400/30"
                title="Open Telegram to contact Administrator directly"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{telegramBtnText}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Local Machine Hardware Identifier Badge */}
        {localHardware && (
          <div className="mt-3 px-3.5 py-1.5 bg-slate-900/80 border border-slate-800/90 rounded-full flex items-center gap-2 text-[11px] text-slate-400 shadow-sm">
            <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>This Device Hardware ID:</span>
            <code className="font-mono text-cyan-300 font-bold">{localHardware.macAddress}</code>
            <button
              type="button"
              onClick={() => copyLocalMacToClipboard(localHardware.macAddress)}
              className="text-cyan-400 hover:text-white ml-0.5 cursor-pointer flex items-center gap-1"
              title="Copy this computer's MAC address"
            >
              {copiedLocalMac ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5 text-[10px]">
                  <Check className="w-3 h-3" /> Copied!
                </span>
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 z-10 flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-850 gap-2">
        <div>
          <span>Sayonika PVC Utility v2.5 PRO • </span>
          <span className="text-slate-400">Biswas Xerox Centre, Bara Andulia</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Lead Dev: Samit Biswas</span>
          <span>•</span>
          <span className="font-mono">biswasxerox40@gmail.com</span>
        </div>
      </footer>

      {/* UPI QR & UTR Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        prefillUserId={prefillUserId}
        prefillUserName={prefillUserName}
      />
    </div>
  );
};
