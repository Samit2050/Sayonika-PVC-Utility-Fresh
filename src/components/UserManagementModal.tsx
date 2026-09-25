import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  UserX, 
  UserCheck, 
  KeyRound, 
  RefreshCw, 
  Trash2, 
  PowerOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  Radio,
  Lock,
  Unlock,
  Globe,
  Edit2,
  Sliders,
  Sparkles,
  Send,
  MessageCircle,
  Calendar,
  Clock,
  ExternalLink,
  ShieldAlert,
  Save,
  Check,
  CreditCard,
  QrCode,
  Copy,
  DollarSign,
  Zap,
  Tag,
  FileText,
  Smartphone,
  Plus,
  Monitor,
  Laptop,
  Cpu,
  RotateCcw,
  Terminal,
  Info,
  ShieldX,
  Ban,
  Activity,
  MessageSquare,
  User,
  Phone
} from 'lucide-react';
import {
  UserMessage,
  MessageCategory,
  MessageStatus,
  subscribeToAllUserMessages,
  replyToUserMessage,
  updateUserMessageStatus,
  deleteUserMessage
} from '../utils/userMessageService';
import { 
  AppUser, 
  subscribeToAllUsers, 
  createAuthorizedUser, 
  updateAuthorizedUser, 
  deleteAuthorizedUser,
  terminateUserSession,
  normalizeUserId,
  SystemSecurityConfig,
  DEFAULT_SECURITY_CONFIG,
  subscribeToSecurityConfig,
  setPublicAccessMode,
  updateTelegramSecurityConfig,
  approveUserWithSubscription,
  grantTrialPeriod,
  extendUserSubscription,
  expireUserSubscription,
  grantLifetimeAccess,
  calculateExpiryTimestamp,
  getSubscriptionStatusDetails,
  bindUserHardwareId,
  unbindUserHardwareId,
  toggleUserPcBinding,
  updateUserHardwareBinding,
  blockHardwareDevice,
  unblockHardwareDevice,
  clearUserHardwareBinding,
  isDeviceHardwareBlocked,
  BlockedHardwareDevice
} from '../utils/authService';
import { 
  getDeviceHardwareInfo, 
  DeviceHardwareInfo, 
  HARDWARE_HELP_COMMANDS, 
  normalizeMacAddress,
  refreshDeviceHardwareInfo,
  reRegisterDeviceHardware,
  clearDeviceHardwareOverride,
  setManualMacOverride,
  getManualMacOverride,
  isValidMacAddress
} from '../utils/deviceIdentifier';
import {
  SubscriptionPaymentRequest,
  UpiPricingConfig,
  SubscriptionPlan,
  DEFAULT_SUBSCRIPTION_PLANS,
  getLocalPricingConfig,
  subscribeToPricingConfig,
  updateSubscriptionPricingConfig,
  subscribeToAllPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
  deletePaymentRequest
} from '../utils/subscriptionPaymentService';
import { playCropSuccessSound } from '../utils/audioNotification';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  initialTab?: 'users' | 'requests' | 'messages' | 'pricing' | 'telegram' | 'public' | 'hardware';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'messages' | 'pricing' | 'telegram' | 'public' | 'hardware'>(initialTab || 'users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [msgFilter, setMsgFilter] = useState<'all' | 'unread' | 'replied' | 'resolved'>('all');
  const [msgSearch, setMsgSearch] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [securityConfig, setSecurityConfig] = useState<SystemSecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'pending' | 'expired' | 'admin' | 'operator' | 'user'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Diagnostic Panel & Device Hardware Control State
  const [isRefreshingHardware, setIsRefreshingHardware] = useState(false);
  const [isReRegisteringHardware, setIsReRegisteringHardware] = useState(false);
  const [showManualMacModal, setShowManualMacModal] = useState(false);
  const [manualMacModalInput, setManualMacModalInput] = useState('');
  const [blockInputMac, setBlockInputMac] = useState('');
  const [blockInputReason, setBlockInputReason] = useState('');
  const [blockInputLabel, setBlockInputLabel] = useState('');
  const [isBlockingSubmitting, setIsBlockingSubmitting] = useState(false);
  const [togglingBlockMac, setTogglingBlockMac] = useState<string | null>(null);
  const [clearingBindingUserId, setClearingBindingUserId] = useState<string | null>(null);
  const [bindSelectedUserForCurrentPc, setBindSelectedUserForCurrentPc] = useState('');

  // In-modal Deletion Confirmation State
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Approval Modal / Popover State
  const [userToApprove, setUserToApprove] = useState<AppUser | null>(null);
  const [approvalDays, setApprovalDays] = useState<number>(30);
  const [approvalRole, setApprovalRole] = useState<'operator' | 'admin' | 'user'>('operator');
  const [approvalBindPc, setApprovalBindPc] = useState(true);
  const [approvalMacInput, setApprovalMacInput] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Current PC Hardware Info & Bind Modal State
  const [localHardware, setLocalHardware] = useState<DeviceHardwareInfo | null>(null);
  const [userToBindPc, setUserToBindPc] = useState<AppUser | null>(null);
  const [bindMacInput, setBindMacInput] = useState('');
  const [bindLabelInput, setBindLabelInput] = useState('');
  const [bindEnforceToggle, setBindEnforceToggle] = useState(true);
  const [isBindingSubmitting, setIsBindingSubmitting] = useState(false);
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'user'>('operator');
  const [newIsAllowed, setNewIsAllowed] = useState(true);
  const [newSubscriptionDays, setNewSubscriptionDays] = useState<number>(30); // 0 = Lifetime
  const [newIsPcBindingEnabled, setNewIsPcBindingEnabled] = useState(true);
  const [newBoundHardwareId, setNewBoundHardwareId] = useState('');
  const [newBoundHardwareLabel, setNewBoundHardwareLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'operator' | 'user'>('operator');
  const [editIsAllowed, setEditIsAllowed] = useState(true);
  const [editIsApproved, setEditIsApproved] = useState(true);
  const [editSubscriptionDays, setEditSubscriptionDays] = useState<number>(30);
  const [editIsLifetime, setEditIsLifetime] = useState(false);
  const [editIsPcBindingEnabled, setEditIsPcBindingEnabled] = useState(false);
  const [editBoundHardwareId, setEditBoundHardwareId] = useState('');
  const [editBoundHardwareLabel, setEditBoundHardwareLabel] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Telegram / Contact Config State
  const [telegramLink, setTelegramLink] = useState('');
  const [telegramBtnText, setTelegramBtnText] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [adminContactMessage, setAdminContactMessage] = useState('');
  const [adminContactPhone, setAdminContactPhone] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Payment Requests (Option 1: UPI QR + UTR) State
  const [paymentRequests, setPaymentRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectingRequest, setRejectingRequest] = useState<SubscriptionPaymentRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // UPI Pricing & Plans Config State
  const [pricingConfig, setPricingConfig] = useState<UpiPricingConfig>(getLocalPricingConfig());
  const [editUpiId, setEditUpiId] = useState(pricingConfig.upiId);
  const [editPayeeName, setEditPayeeName] = useState(pricingConfig.payeeName);
  const [editQrNote, setEditQrNote] = useState(pricingConfig.qrNote);
  const [editInstructions, setEditInstructions] = useState(pricingConfig.instructions);
  const [editPlans, setEditPlans] = useState<SubscriptionPlan[]>(pricingConfig.plans || DEFAULT_SUBSCRIPTION_PLANS);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Real-time Firestore users, security config, payment requests, and pricing config listeners
  useEffect(() => {
    if (!isOpen) return;

    const unsubUsers = subscribeToAllUsers((userList) => {
      setUsers(userList);
    });

    const unsubSecurity = subscribeToSecurityConfig((cfg) => {
      setSecurityConfig(cfg);
      setTelegramLink(cfg.telegramLink || 'https://t.me/BiswasXerox');
      setTelegramBtnText(cfg.telegramButtonText || 'Contact Admin on Telegram');
      setTelegramUsername(cfg.telegramUsername || '@BiswasXerox');
      setAdminContactMessage(cfg.adminContactMessage || 'To activate your account, get subscriptions, or report issues, contact Administrator directly on Telegram.');
      setAdminContactPhone(cfg.adminContactPhone || '+91 9876543210');
    });

    const unsubRequests = subscribeToAllPaymentRequests((reqs) => {
      setPaymentRequests(reqs);
    });

    const unsubPricing = subscribeToPricingConfig((cfg) => {
      if (cfg) {
        setPricingConfig(cfg);
        setEditUpiId(cfg.upiId || '');
        setEditPayeeName(cfg.payeeName || '');
        setEditQrNote(cfg.qrNote || '');
        setEditInstructions(cfg.instructions || '');
        setEditPlans(Array.isArray(cfg.plans) && cfg.plans.length > 0 ? cfg.plans : DEFAULT_SUBSCRIPTION_PLANS);
      }
    });

    const unsubMessages = subscribeToAllUserMessages((msgs) => {
      setUserMessages(msgs);
    });

    // Detect local PC hardware info
    getDeviceHardwareInfo().then((info) => {
      setLocalHardware(info);
    }).catch((err) => {
      console.warn('Failed to detect device hardware info:', err);
    });

    return () => {
      unsubUsers();
      unsubSecurity();
      unsubRequests();
      unsubPricing();
      unsubMessages();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMac(text);
      setTimeout(() => setCopiedMac(null), 2500);
      showToast(`Copied ${label} to clipboard!`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subDays = Number(newSubscriptionDays);
    const expiresAt = subDays > 0 ? calculateExpiryTimestamp(subDays) : 0;

    const res = await createAuthorizedUser({
      userId: newUserId,
      name: newName,
      password: newPassword,
      role: newRole,
      isAllowed: newIsAllowed,
      subscriptionDays: subDays,
      subscriptionExpiresAt: expiresAt,
      subscriptionType: subDays === 0 ? 'lifetime' : 'days',
      isPcBindingEnabled: newIsPcBindingEnabled,
      boundHardwareId: newBoundHardwareId ? normalizeMacAddress(newBoundHardwareId) : '',
      boundHardwareLabel: newBoundHardwareLabel.trim() || (newBoundHardwareId ? `Registered PC (${newBoundHardwareId})` : ''),
      notes: newNotes,
    });

    setIsSubmitting(false);

    if (res.success) {
      showToast(`User @${newUserId} created successfully with ${subDays === 0 ? 'Lifetime' : `${subDays} Days`} subscription.`);
      setShowAddForm(false);
      setNewUserId('');
      setNewName('');
      setNewPassword('');
      setNewNotes('');
      setNewBoundHardwareId('');
      setNewBoundHardwareLabel('');
      setNewSubscriptionDays(30);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const startEditUser = (u: AppUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPassword(u.password);
    setEditRole(u.role);
    setEditIsAllowed(u.isAllowed);
    setEditIsApproved(u.isApproved !== false);
    setEditSubscriptionDays(u.subscriptionDays || 30);
    setEditIsLifetime(u.subscriptionType === 'lifetime' || (u.subscriptionExpiresAt === 0 && u.isApproved));
    setEditIsPcBindingEnabled(u.isPcBindingEnabled !== false && !!u.boundHardwareId);
    setEditBoundHardwareId(u.boundHardwareId || '');
    setEditBoundHardwareLabel(u.boundHardwareLabel || '');
    setEditNotes(u.notes || '');
    setShowAddForm(false);
    setUserToApprove(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    const subDays = Number(editSubscriptionDays);
    const isLifetime = editIsLifetime || subDays === 0;

    let expiresAt: number = 0;
    if (!isLifetime) {
      if (editingUser.subscriptionExpiresAt && editingUser.subscriptionExpiresAt > Date.now()) {
        expiresAt = editingUser.subscriptionExpiresAt;
      } else {
        expiresAt = calculateExpiryTimestamp(subDays > 0 ? subDays : 30);
      }
    }

    const res = await updateAuthorizedUser(editingUser.userId, {
      name: editName,
      password: editPassword,
      role: editRole,
      isAllowed: editIsAllowed,
      isApproved: editIsApproved,
      subscriptionDays: isLifetime ? 0 : subDays,
      subscriptionType: isLifetime ? 'lifetime' : 'days',
      subscriptionExpiresAt: expiresAt,
      isPcBindingEnabled: editIsPcBindingEnabled,
      boundHardwareId: editBoundHardwareId ? normalizeMacAddress(editBoundHardwareId) : '',
      boundHardwareLabel: editBoundHardwareLabel.trim(),
      notes: editNotes,
    });

    setIsSubmitting(false);

    if (res.success) {
      showToast(`User @${editingUser.userId} updated successfully.`);
      setEditingUser(null);
    } else {
      showToast(`Update Error: ${res.error}`);
    }
  };

  const startQuickApprove = (u: AppUser) => {
    setUserToApprove(u);
    setApprovalDays(30);
    setApprovalRole('operator');
    setApprovalBindPc(true);
    setApprovalMacInput(u.lastSeenHardwareId || u.boundHardwareId || localHardware?.macAddress || '');
    setShowAddForm(false);
    setEditingUser(null);
  };

  const handleConfirmQuickApprove = async () => {
    if (!userToApprove) return;
    setIsApproving(true);

    const macToBind = approvalBindPc ? (approvalMacInput.trim() || userToApprove.lastSeenHardwareId || localHardware?.macAddress || '') : '';

    const res = await approveUserWithSubscription(
      userToApprove.userId,
      Number(approvalDays),
      approvalRole,
      {
        isPcBindingEnabled: approvalBindPc,
        boundHardwareId: macToBind,
        boundHardwareLabel: macToBind ? `Registered PC (${macToBind})` : ''
      }
    );

    setIsApproving(false);

    if (res.success) {
      playCropSuccessSound();
      showToast(`Account @${userToApprove.userId} approved & granted ${approvalDays === 0 ? 'Lifetime Access' : `${approvalDays} Days Subscription`}!`);
      setUserToApprove(null);
    } else {
      showToast(`Approval Error: ${res.error}`);
    }
  };

  const handleQuickBindCurrentPc = async (user: AppUser) => {
    if (!localHardware?.macAddress) {
      showToast('Hardware MAC could not be determined on this PC.');
      return;
    }
    const res = await bindUserHardwareId(user.userId, localHardware.macAddress, `Counter PC (${localHardware.macAddress})`);
    if (res.success) {
      playCropSuccessSound();
      showToast(`💻 Bound @${user.userId} to this computer (MAC: ${localHardware.macAddress})!`);
    } else {
      showToast(`Binding Error: ${res.error}`);
    }
  };

  const handleUnbindUserPc = async (user: AppUser) => {
    const res = await unbindUserHardwareId(user.userId);
    if (res.success) {
      showToast(`🔓 PC binding removed for @${user.userId}. User can now log in from any PC.`);
    } else {
      showToast(`Unbind Error: ${res.error}`);
    }
  };

  const handleGrantTrial = async (user: AppUser, days: number = 10) => {
    const res = await grantTrialPeriod(user.userId, days);
    if (res.success) {
      playCropSuccessSound();
      showToast(`🎁 Granted ${days}-Day Free Trial to @${user.userId}!`);
    } else {
      showToast(`Trial Error: ${res.error}`);
    }
  };

  const handleExtendSubscription = async (user: AppUser, days: number = 30) => {
    const res = await extendUserSubscription(user.userId, days);
    if (res.success) {
      playCropSuccessSound();
      showToast(`✅ Extended subscription for @${user.userId} by +${days} Days!`);
    } else {
      showToast(`Extension Error: ${res.error}`);
    }
  };

  const handleExpireSubscription = async (user: AppUser) => {
    if (!window.confirm(`Expire access for @${user.userId} immediately?\nUser will require an active subscription to log in again.`)) {
      return;
    }
    const res = await expireUserSubscription(user.userId);
    if (res.success) {
      showToast(`🔴 Subscription expired for @${user.userId}.`);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleGrantLifetime = async (user: AppUser) => {
    const res = await grantLifetimeAccess(user.userId);
    if (res.success) {
      playCropSuccessSound();
      showToast(`⭐ Granted Lifetime Access to @${user.userId}!`);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  // Refresh Hardware Binding / Specs
  const handleRefreshHardwareBinding = async () => {
    setIsRefreshingHardware(true);
    try {
      const info = await refreshDeviceHardwareInfo();
      setLocalHardware(info);
      playCropSuccessSound();
      showToast(`Hardware specs refreshed: MAC ${info.macAddress} verified.`);
    } catch (err: any) {
      showToast(`Refresh failed: ${err.message}`);
    } finally {
      setIsRefreshingHardware(false);
    }
  };

  // Re-register Device ID (Clears persistent seed and generates new cryptographic HWID)
  const handleReRegisterDeviceId = async () => {
    if (!window.confirm('Re-register this device ID?\n\nThis will clear the current machine hardware seed and generate a brand-new unique cryptographic hardware signature and MAC ID.')) {
      return;
    }
    setIsReRegisteringHardware(true);
    try {
      const info = await reRegisterDeviceHardware();
      setLocalHardware(info);
      playCropSuccessSound();
      showToast(`Device ID re-registered successfully! New MAC: ${info.macAddress}`);
    } catch (err: any) {
      showToast(`Re-registration failed: ${err.message}`);
    } finally {
      setIsReRegisteringHardware(false);
    }
  };

  // Manual Physical MAC Override (e.g. from getmac /v)
  const handleApplyManualMacOverride = async (mac: string) => {
    const clean = normalizeMacAddress(mac);
    if (!clean) {
      showToast('Please enter a valid MAC address');
      return;
    }
    const info = await refreshDeviceHardwareInfo({ manualMac: clean });
    setLocalHardware(info);
    setShowManualMacModal(false);
    setManualMacModalInput('');
    playCropSuccessSound();
    showToast(`Physical NIC MAC override applied: ${info.macAddress}`);
  };

  // Clear Manual MAC Override (restore auto-detected)
  const handleClearManualMacOverride = async () => {
    const info = await refreshDeviceHardwareInfo({ clearOverride: true });
    setLocalHardware(info);
    showToast(`Reset to auto-detected system hardware MAC: ${info.macAddress}`);
  };

  // Block a Device ID
  const handleBlockDevice = async (macToBlock: string, reason?: string, label?: string) => {
    const cleanMac = normalizeMacAddress(macToBlock);
    if (!cleanMac) {
      showToast('Please specify a valid MAC address to block.');
      return;
    }
    setTogglingBlockMac(cleanMac);
    setIsBlockingSubmitting(true);
    const res = await blockHardwareDevice(cleanMac, reason || 'Blocked by Administrator', label, currentUserId);
    setTogglingBlockMac(null);
    setIsBlockingSubmitting(false);

    if (res.success) {
      showToast(`⛔ Device ${cleanMac} is now blocked from accessing any registered accounts.`);
      setBlockInputMac('');
      setBlockInputReason('');
      setBlockInputLabel('');
    } else {
      showToast(`Block failed: ${res.error}`);
    }
  };

  // Unblock a Device ID
  const handleUnblockDevice = async (macToUnblock: string) => {
    const cleanMac = normalizeMacAddress(macToUnblock);
    if (!cleanMac) return;
    setTogglingBlockMac(cleanMac);
    const res = await unblockHardwareDevice(cleanMac);
    setTogglingBlockMac(null);

    if (res.success) {
      playCropSuccessSound();
      showToast(`✅ Device ${cleanMac} has been unblocked. Access restored.`);
    } else {
      showToast(`Unblock failed: ${res.error}`);
    }
  };

  // Clear Hardware Binding for a specific user
  const handleClearUserHardwareBinding = async (userId: string, userName: string) => {
    setClearingBindingUserId(userId);
    const res = await clearUserHardwareBinding(userId);
    setClearingBindingUserId(null);

    if (res.success) {
      showToast(`Hardware binding cleared for @${userId} (${userName}). Account can now log in from any PC.`);
    } else {
      showToast(`Clear binding failed: ${res.error}`);
    }
  };

  const openHardwareModal = (user: AppUser) => {
    setUserToBindPc(user);
    setBindMacInput(user.boundHardwareId || user.lastSeenHardwareId || localHardware?.macAddress || '');
    setBindLabelInput(user.boundHardwareLabel || `Counter PC (${user.name})`);
    setBindEnforceToggle(user.isPcBindingEnabled !== false);
  };

  const handleSaveHardwareBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToBindPc) return;
    setIsBindingSubmitting(true);
    const res = await updateUserHardwareBinding(userToBindPc.userId, {
      isPcBindingEnabled: bindEnforceToggle,
      boundHardwareId: bindMacInput.trim() ? normalizeMacAddress(bindMacInput) : '',
      boundHardwareLabel: bindLabelInput.trim()
    });
    setIsBindingSubmitting(false);
    if (res.success) {
      playCropSuccessSound();
      showToast(`PC Hardware Binding updated for @${userToBindPc.userId}!`);
      setUserToBindPc(null);
    } else {
      showToast(`Update failed: ${res.error}`);
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    const nextAllowed = !user.isAllowed;
    const res = await updateAuthorizedUser(user.userId, {
      isAllowed: nextAllowed,
    });

    if (res.success) {
      showToast(`User "${user.userId}" access is now ${nextAllowed ? 'ALLOWED' : 'SUSPENDED'}.`);
    }
  };

  const handleTogglePublicAccess = async () => {
    setIsTogglingPublic(true);
    const nextState = !securityConfig.publicAccessEnabled;
    const res = await setPublicAccessMode(nextState, currentUserId);
    setIsTogglingPublic(false);

    if (res.success) {
      showToast(
        nextState 
          ? '🌐 Public Open Access ENABLED: Anyone can use the app without logging in.' 
          : '🔒 Public Access DISABLED: Strict login is now enforced. Only authorized accounts can log in.'
      );
    } else {
      showToast(`Failed to update public access: ${res.error}`);
    }
  };

  const handleForceDisconnect = async (user: AppUser) => {
    const ok = await terminateUserSession(user.userId);
    if (ok) {
      showToast(`Active session terminated for "${user.userId}". They will be logged out immediately.`);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const res = await deleteAuthorizedUser(userToDelete.userId);
    setIsDeleting(false);

    if (res.success) {
      showToast(`User "${userToDelete.userId}" deleted permanently.`);
      setUserToDelete(null);
    } else {
      showToast(`Delete Error: ${res.error}`);
    }
  };

  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);

    const res = await updateTelegramSecurityConfig({
      telegramLink: telegramLink.trim(),
      telegramButtonText: telegramBtnText.trim(),
      telegramUsername: telegramUsername.trim(),
      adminContactMessage: adminContactMessage.trim(),
      adminContactPhone: adminContactPhone.trim(),
    }, currentUserId);

    setIsSavingTelegram(false);

    if (res.success) {
      showToast('Telegram Link & Admin Contact details updated on Login Screen!');
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  // Payment Requests Handlers
  const handleApproveRequest = async (req: SubscriptionPaymentRequest, customDays?: number) => {
    setIsActionInProgress(true);
    const res = await approvePaymentRequest(req, customDays, currentUserId);
    setIsActionInProgress(false);

    if (res.success) {
      playCropSuccessSound();
      showToast(`Verified UPI UTR ${req.utrNumber}! User @${req.userId} granted ${req.planDays === 0 ? 'Lifetime' : `${req.planDays} Days`} subscription.`);
    } else {
      showToast(`Approval Error: ${res.error}`);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsActionInProgress(true);
    const res = await rejectPaymentRequest(rejectingRequest.id, rejectionReasonText, currentUserId);
    setIsActionInProgress(false);

    if (res.success) {
      showToast(`Payment request for @${rejectingRequest.userId} rejected.`);
      setRejectingRequest(null);
      setRejectionReasonText('');
    } else {
      showToast(`Reject Error: ${res.error}`);
    }
  };

  const handleDeleteRequest = async (reqId: string) => {
    const res = await deletePaymentRequest(reqId);
    if (res.success) {
      showToast('Payment request record deleted.');
    }
  };

  // Pricing Config Handlers
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);

    const res = await updateSubscriptionPricingConfig({
      upiId: editUpiId.trim(),
      payeeName: editPayeeName.trim(),
      qrNote: editQrNote.trim(),
      instructions: editInstructions.trim(),
      plans: editPlans,
    }, currentUserId);

    setIsSavingPricing(false);

    if (res.success) {
      showToast('UPI ID & Subscription Plans pricing updated successfully!');
    } else {
      showToast(`Pricing Save Error: ${res.error}`);
    }
  };

  const handleUpdatePlanPrice = (index: number, newPrice: number) => {
    const updated = [...editPlans];
    updated[index] = { ...updated[index], priceInr: Math.max(0, newPrice) };
    setEditPlans(updated);
  };

  const handleTogglePlanEnabled = (index: number) => {
    const updated = [...editPlans];
    updated[index] = { ...updated[index], isEnabled: !updated[index].isEnabled };
    setEditPlans(updated);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.mobileNumber && u.mobileNumber.includes(searchQuery)) ||
      (u.notes && u.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterRole === 'all') return true;
    if (filterRole === 'pending') return u.isApproved === false;
    if (filterRole === 'expired') {
      return u.role !== 'admin' && u.subscriptionExpiresAt && u.subscriptionExpiresAt > 0 && Date.now() > u.subscriptionExpiresAt;
    }
    return u.role === filterRole;
  });

  const pendingUserCount = users.filter(u => u.isApproved === false).length;
  const pendingRequestsCount = paymentRequests.filter(r => r.status === 'pending').length;

  const filteredRequests = paymentRequests.filter((r) => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  // User Messages handlers & filters
  const unreadMessagesCount = userMessages.filter(m => m.status === 'unread').length;

  const filteredUserMessages = userMessages.filter((m) => {
    const query = msgSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      m.userName.toLowerCase().includes(query) ||
      (m.userMobile && m.userMobile.includes(query)) ||
      m.subject.toLowerCase().includes(query) ||
      m.message.toLowerCase().includes(query) ||
      (m.hardwareId && m.hardwareId.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (msgFilter === 'all') return true;
    return m.status === msgFilter;
  });

  const handleSendAdminReply = async (msgId: string) => {
    if (!replyText.trim()) {
      showToast('Please enter your reply text.');
      return;
    }
    setIsSendingReply(true);
    const res = await replyToUserMessage(msgId, replyText.trim(), currentUserId);
    setIsSendingReply(false);

    if (res.success) {
      playCropSuccessSound();
      showToast('Reply successfully sent to user!');
      setActiveReplyId(null);
      setReplyText('');
    } else {
      showToast(`Reply error: ${res.error}`);
    }
  };

  const handleUpdateMsgStatus = async (msgId: string, status: MessageStatus) => {
    const res = await updateUserMessageStatus(msgId, status);
    if (res.success) {
      showToast(`Message marked as ${status}.`);
    } else {
      showToast(`Status update failed: ${res.error}`);
    }
  };

  const handleDeleteUserMsg = async (msgId: string) => {
    if (!window.confirm('Delete this user message record permanently?')) return;
    const res = await deleteUserMessage(msgId);
    if (res.success) {
      showToast('Message deleted.');
    } else {
      showToast(`Delete failed: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  User Management & Subscription Administration
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono font-bold">
                  Admin Panel
                </span>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                    {pendingRequestsCount} Payment Requests
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Manage operators, instant UPI QR + UTR payment requests, plan pricing, and security
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Notification Toast */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto">
          
          {/* Tab: Users */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Access</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
              {users.length}
            </span>
          </button>

          {/* Tab: Payment Requests (Option 1: UPI + UTR) */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'requests'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>💳 Payment Requests (UPI + UTR)</span>
            {pendingRequestsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                {paymentRequests.length}
              </span>
            )}
          </button>

          {/* Tab: User Messages & Support */}
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'messages'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>💬 User Messages</span>
            {unreadMessagesCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold animate-pulse">
                {unreadMessagesCount} New
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                {userMessages.length}
              </span>
            )}
          </button>

          {/* Tab: UPI & Plan Pricing */}
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>⚙️ UPI & Pricing Setup</span>
          </button>

          {/* Tab: Telegram */}
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'telegram'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span>Telegram Support</span>
          </button>

          {/* Tab: Public Access */}
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'public'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-purple-400" />
            <span>Public Access</span>
            {securityConfig.publicAccessEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Tab: Hardware Diagnostics & Device Control */}
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>🖥️ Hardware & Device Control</span>
            {securityConfig.blockedHardwareIds && securityConfig.blockedHardwareIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono font-bold">
                {securityConfig.blockedHardwareIds.length} Blocked
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: User Management & Subscription Control */}
        {activeTab === 'users' && (
          <>
            {/* Toolbar: Search, Filter, Add User */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Mobile, ID, name, or note..."
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e: any) => setFilterRole(e.target.value)}
                  className="bg-slate-900 border border-slate-750 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="all">All Accounts ({users.length})</option>
                  <option value="pending">⏳ Pending Approval ({pendingUserCount})</option>
                  <option value="expired">🔴 Expired Subscriptions</option>
                  <option value="admin">Admins</option>
                  <option value="operator">Operators</option>
                  <option value="user">Users</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingUser(null);
                  setUserToApprove(null);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel Form' : 'Add New Operator'}</span>
              </button>
            </div>

            {/* Sub-Forms (Add, Edit, Quick Approve) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Quick Approve Popover */}
              {userToApprove && (
                <div className="p-4 bg-amber-950/80 border border-amber-500/60 rounded-xl space-y-3 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Quick Approve & Grant Subscription: @{userToApprove.userId} ({userToApprove.name})</span>
                    </div>
                    <button
                      onClick={() => setUserToApprove(null)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Subscription Days</label>
                      <select
                        value={approvalDays}
                        onChange={(e) => setApprovalDays(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value={30}>30 Days (1 Month)</option>
                        <option value={90}>90 Days (3 Months)</option>
                        <option value={180}>180 Days (6 Months)</option>
                        <option value={365}>365 Days (1 Year)</option>
                        <option value={0}>Lifetime Access (0 = No Expiry)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Assigned Role</label>
                      <select
                        value={approvalRole}
                        onChange={(e: any) => setApprovalRole(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="operator">Operator (Printing Studio)</option>
                        <option value="admin">Administrator</option>
                        <option value="user">Standard User</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={isApproving}
                        onClick={handleConfirmQuickApprove}
                        className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isApproving ? 'Approving...' : 'Approve & Activate Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* PC MAC Binding in Quick Approve */}
                  <div className="pt-2 border-t border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-amber-200">
                      <input
                        type="checkbox"
                        checked={approvalBindPc}
                        onChange={(e) => setApprovalBindPc(e.target.checked)}
                        className="rounded bg-slate-900 border-amber-500/50 text-amber-500 cursor-pointer"
                      />
                      <span className="font-semibold flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-amber-400" />
                        Lock Account to PC MAC:
                      </span>
                    </label>

                    {approvalBindPc && (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={approvalMacInput}
                          onChange={(e) => setApprovalMacInput(e.target.value)}
                          placeholder="e.g. 00:1A:2B:3C:4D:5E"
                          className="flex-1 bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-amber-200 font-mono"
                        />
                        {localHardware?.macAddress && (
                          <button
                            type="button"
                            onClick={() => setApprovalMacInput(localHardware.macAddress)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded border border-slate-700 cursor-pointer"
                            title="Fill with this computer's MAC"
                          >
                            Use This PC
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add User Form */}
              {showAddForm && (
                <form onSubmit={handleCreateUser} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 animate-fade-in shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-blue-400" />
                      <span>Create New Authorized User</span>
                    </span>
                    <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Mobile / User ID *</label>
                      <input
                        type="text"
                        required
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Operator Name *</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Biswas Xerox"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Password *</label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Role</label>
                      <select
                        value={newRole}
                        onChange={(e: any) => setNewRole(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value="operator">Operator</option>
                        <option value="admin">Administrator</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Subscription Days (0=Lifetime)</label>
                      <input
                        type="number"
                        min={0}
                        value={newSubscriptionDays}
                        onChange={(e) => setNewSubscriptionDays(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Remarks / Note</label>
                      <input
                        type="text"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="e.g. Paid via UPI"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  {/* PC Binding Options for New User */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-cyan-300">
                        <input
                          type="checkbox"
                          checked={newIsPcBindingEnabled}
                          onChange={(e) => setNewIsPcBindingEnabled(e.target.checked)}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Enforce PC-Binding Registration (Lock account to specific computer)</span>
                        </span>
                      </label>
                    </div>

                    {newIsPcBindingEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-medium text-slate-300">PC Hardware MAC / CPU ID</label>
                            {localHardware?.macAddress && (
                              <button
                                type="button"
                                onClick={() => setNewBoundHardwareId(localHardware.macAddress)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                Use This PC ({localHardware.macAddress})
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={newBoundHardwareId}
                            onChange={(e) => setNewBoundHardwareId(e.target.value)}
                            placeholder="Leave empty to auto-bind upon 1st login, or enter MAC"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs placeholder:text-slate-600"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-300 mb-1">PC Device Label</label>
                          <input
                            type="text"
                            value={newBoundHardwareLabel}
                            onChange={(e) => setNewBoundHardwareLabel(e.target.value)}
                            placeholder="e.g. Counter 1 Desktop / Shop PC"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Creating...' : 'Save User Account'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Edit User Form */}
              {editingUser && (
                <form onSubmit={handleSaveEditUser} className="p-4 bg-slate-950/90 border border-blue-500/50 rounded-xl space-y-3 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4 text-blue-400" />
                      <span>Editing Account: @{editingUser.userId}</span>
                    </span>
                    <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Operator Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Password</label>
                      <input
                        type="text"
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Role</label>
                      <select
                        value={editRole}
                        onChange={(e: any) => setEditRole(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value="operator">Operator</option>
                        <option value="admin">Administrator</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Subscription Days</label>
                      <input
                        type="number"
                        min={0}
                        value={editSubscriptionDays}
                        onChange={(e) => setEditSubscriptionDays(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      />
                      <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => { setEditSubscriptionDays(10); setEditIsLifetime(false); }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer transition"
                        >
                          🎁 10-Day Trial
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditSubscriptionDays(30); setEditIsLifetime(false); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] cursor-pointer transition"
                        >
                          30 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditSubscriptionDays(90); setEditIsLifetime(false); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] cursor-pointer transition"
                        >
                          90 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditSubscriptionDays(365); setEditIsLifetime(false); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] cursor-pointer transition"
                        >
                          365 Days
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="editIsLifetime"
                        checked={editIsLifetime}
                        onChange={(e) => setEditIsLifetime(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600"
                      />
                      <label htmlFor="editIsLifetime" className="text-xs text-slate-300 font-medium cursor-pointer">
                        Lifetime Access (No Expiry)
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="editIsApproved"
                        checked={editIsApproved}
                        onChange={(e) => setEditIsApproved(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-600 cursor-pointer"
                      />
                      <label htmlFor="editIsApproved" className="text-xs text-emerald-300 font-medium cursor-pointer">
                        Approved Status (Allowed to Login)
                      </label>
                    </div>
                  </div>

                  {/* PC Binding Settings for Edit Form */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-cyan-300">
                        <input
                          type="checkbox"
                          checked={editIsPcBindingEnabled}
                          onChange={(e) => setEditIsPcBindingEnabled(e.target.checked)}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Strict PC-Binding Lock (Reject logins from other computers)</span>
                        </span>
                      </label>
                    </div>

                    {editIsPcBindingEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-medium text-slate-300">Bound PC MAC Address</label>
                            {localHardware?.macAddress && (
                              <button
                                type="button"
                                onClick={() => setEditBoundHardwareId(localHardware.macAddress)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                Use Current PC ({localHardware.macAddress})
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={editBoundHardwareId}
                            onChange={(e) => setEditBoundHardwareId(e.target.value)}
                            placeholder="e.g. 00:1A:2B:3C:4D:5E"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-300 mb-1">PC Device Name / Label</label>
                          <input
                            type="text"
                            value={editBoundHardwareLabel}
                            onChange={(e) => setEditBoundHardwareLabel(e.target.value)}
                            placeholder="e.g. Main Cashier PC"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Saving...' : 'Update Account'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Local Machine Hardware MAC Diagnostic & Status Bar */}
              {localHardware && (
                (() => {
                  const boundUser = users.find(u => u.boundHardwareId && normalizeMacAddress(u.boundHardwareId) === normalizeMacAddress(localHardware.macAddress));
                  const isBlocked = isDeviceHardwareBlocked(localHardware.macAddress, securityConfig.blockedHardwareIds);

                  return (
                    <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shadow-lg">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                          isBlocked 
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' 
                            : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        }`}>
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span>Current PC Hardware:</span>
                              <code className="px-2 py-0.5 bg-slate-950 border border-cyan-500/50 rounded-lg text-cyan-300 font-mono font-bold text-xs tracking-wider">
                                {localHardware.macAddress}
                              </code>
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(localHardware.macAddress, 'PC MAC Address')}
                              className="p-1 hover:bg-slate-800 text-cyan-400 hover:text-white rounded cursor-pointer"
                              title="Copy MAC Address"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Binding status pill */}
                            {boundUser ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Bound to: {boundUser.name} (@{boundUser.userId})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-amber-300 font-medium text-[11px]">
                                🌐 Unbound Standalone PC
                              </span>
                            )}

                            {/* Block status pill */}
                            {isBlocked ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-950 border border-rose-600 text-rose-300 font-bold text-[11px] flex items-center gap-1 animate-pulse">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>⛔ BLACKLISTED / BLOCKED</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-[10px] font-mono">
                                🟢 Authorized
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>CPU: <strong className="text-slate-300">{localHardware.cpuCores ?? 8} Cores</strong></span>
                            <span>•</span>
                            <span>OS: <strong className="text-slate-300">{localHardware.platform || localHardware.osPlatform || 'PC'}</strong></span>
                            <span>•</span>
                            <span>Screen: <strong className="text-slate-300">{localHardware.screenResolution || 'Standard'}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">Hash: {(localHardware.hardwareHash || localHardware.hardwareId || '').slice(0, 12)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Action Controls */}
                      <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                        <button
                          type="button"
                          onClick={handleRefreshHardwareBinding}
                          disabled={isRefreshingHardware}
                          className="px-2.5 py-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Refresh Hardware Specs & Detection"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHardware ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>{isRefreshingHardware ? 'Refreshing...' : 'Refresh Binding'}</span>
                        </button>

                        {boundUser && (
                          <button
                            type="button"
                            onClick={() => handleClearUserHardwareBinding(boundUser.userId, boundUser.name)}
                            disabled={clearingBindingUserId === boundUser.userId}
                            className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-700/50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Clear binding for this account"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Clear Binding</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => isBlocked ? handleUnblockDevice(localHardware.macAddress) : handleBlockDevice(localHardware.macAddress, 'Blocked via Machine Quick Toggle', 'Current PC')}
                          disabled={togglingBlockMac === localHardware.macAddress || isBlockingSubmitting}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-500'
                              : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                          }`}
                          title={isBlocked ? 'Unblock this machine' : 'Block this machine from accessing accounts'}
                        >
                          {isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          <span>{isBlocked ? 'Unblock PC' : 'Block PC'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('hardware')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow transition cursor-pointer"
                        >
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Full Diagnostics</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Users List Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No users matching criteria.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const status = getSubscriptionStatusDetails(user);
                    return (
                      <div key={user.userId} className="p-3.5 hover:bg-slate-900/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">@{user.userId}</span>
                            <span className="text-xs text-slate-300 font-medium">({user.name})</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                              user.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {user.role}
                            </span>

                            {/* Status badge */}
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${status.badgeClass}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>Pass: <code className="text-slate-300 font-mono">{user.password}</code></span>
                            {user.mobileNumber && <span>• Mobile: {user.mobileNumber}</span>}
                            {user.subscriptionExpiresAt && user.subscriptionExpiresAt > 0 && (
                              <span>• Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}</span>
                            )}
                            {user.notes && <span className="text-slate-500 italic">• {user.notes}</span>}
                          </div>

                          {/* PC Hardware Binding Info */}
                          <div className="flex items-center gap-2 text-[11px] flex-wrap pt-0.5">
                            {user.boundHardwareId ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                                <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="font-medium">PC Bound:</span>
                                <code className="font-mono font-bold text-cyan-200">{user.boundHardwareId}</code>
                                {user.boundHardwareLabel && (
                                  <span className="text-slate-400">({user.boundHardwareLabel})</span>
                                )}
                                {localHardware?.macAddress && user.boundHardwareId.toUpperCase() === localHardware.macAddress.toUpperCase() && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    This PC ✅
                                  </span>
                                )}
                                {isDeviceHardwareBlocked(user.boundHardwareId, securityConfig.blockedHardwareIds) && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold flex items-center gap-0.5">
                                    <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                    <span>BLOCKED</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.boundHardwareId!, 'MAC Address')}
                                  className="p-0.5 hover:text-white rounded cursor-pointer"
                                  title="Copy Bound MAC"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : user.isPcBindingEnabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>PC Lock: Will auto-bind on 1st login</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                                <Unlock className="w-3 h-3 text-slate-500" />
                                <span>Any PC Allowed</span>
                              </span>
                            )}

                            {user.lastSeenHardwareId && user.lastSeenHardwareId !== user.boundHardwareId && (
                              <span className="text-slate-500 text-[10px]">
                                • Last login attempt MAC: <code className="font-mono text-slate-400">{user.lastSeenHardwareId}</code>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                          {/* PC Binding Action button */}
                          <button
                            type="button"
                            onClick={() => openHardwareModal(user)}
                            className="p-1.5 bg-cyan-950/40 hover:bg-cyan-900 text-cyan-300 rounded-lg border border-cyan-800/40 text-xs cursor-pointer"
                            title="Configure PC MAC / CPU Binding"
                          >
                            <Laptop className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Bind To THIS PC button if different */}
                          {localHardware?.macAddress && user.boundHardwareId?.toUpperCase() !== localHardware.macAddress.toUpperCase() && (
                            <button
                              type="button"
                              onClick={() => handleQuickBindCurrentPc(user)}
                              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer"
                              title="Instantly bind this user to THIS computer"
                            >
                              <Monitor className="w-3 h-3" />
                              <span>Bind This PC</span>
                            </button>
                          )}

                          {/* Reset/Unbind PC button */}
                          {user.boundHardwareId && (
                            <button
                              type="button"
                              onClick={() => handleUnbindUserPc(user)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                              title="Reset / Remove PC Binding (Allow any machine)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Block / Unblock Hardware toggle for this user's bound PC */}
                          {user.boundHardwareId && (
                            (() => {
                              const isBlocked = isDeviceHardwareBlocked(user.boundHardwareId, securityConfig.blockedHardwareIds);
                              return (
                                <button
                                  type="button"
                                  onClick={() => isBlocked ? handleUnblockDevice(user.boundHardwareId!) : handleBlockDevice(user.boundHardwareId!, `Blocked from user @${user.userId}`, user.name)}
                                  disabled={togglingBlockMac === user.boundHardwareId}
                                  className={`p-1.5 rounded-lg text-xs cursor-pointer transition ${
                                    isBlocked
                                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600'
                                      : 'bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/40 hover:text-white'
                                  }`}
                                  title={isBlocked ? `Unblock this machine (${user.boundHardwareId})` : `Block / Blacklist this machine (${user.boundHardwareId})`}
                                >
                                  {isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })()
                          )}
                          {user.isApproved === false && (
                            <button
                              type="button"
                              onClick={() => startQuickApprove(user)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {user.role !== 'admin' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleGrantTrial(user, 10)}
                                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-1 cursor-pointer transition active:scale-95"
                                title="Grant or reset 10-day free trial"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>10d Trial</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExtendSubscription(user, 30)}
                                className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-1 cursor-pointer transition active:scale-95"
                                title="Extend subscription by +30 days"
                              >
                                <Plus className="w-3 h-3 text-emerald-400" />
                                <span>+30d</span>
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => startEditUser(user)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs cursor-pointer"
                            title="Edit Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user)}
                            className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                              user.isAllowed 
                                ? 'bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/40' 
                                : 'bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40'
                            }`}
                            title={user.isAllowed ? 'Suspend Account' : 'Reactivate Account'}
                          >
                            {user.isAllowed ? <PowerOff className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {user.userId !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 bg-red-950/30 hover:bg-red-900 text-red-400 hover:text-white rounded-lg border border-red-800/40 text-xs cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: Payment Requests (Option 1: UPI + UTR) */}
        {activeTab === 'requests' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* Header & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Instant Payment & Subscription Requests • Option 1 (UPI QR + UTR)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Operators submit their 12-digit UPI UTR reference number here. Verify the UTR in your GPay/PhonePe/Paytm and click "Verify & Approve" for 1-click subscription activation!
                </p>
              </div>

              {/* Request Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRequestFilter('pending')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    requestFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pending ({paymentRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('approved')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    requestFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Approved ({paymentRequests.filter(r => r.status === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('rejected')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    requestFilter === 'rejected'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rejected ({paymentRequests.filter(r => r.status === 'rejected').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    requestFilter === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({paymentRequests.length})
                </button>
              </div>
            </div>

            {/* Rejection Modal Popup */}
            {rejectingRequest && (
              <div className="p-4 bg-rose-950/90 border border-rose-500 rounded-xl space-y-3 animate-fade-in shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Reject Payment Request: @{rejectingRequest.userId} (UTR: {rejectingRequest.utrNumber})</span>
                  </div>
                  <button onClick={() => setRejectingRequest(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Rejection Reason (Displayed to user)
                  </label>
                  <input
                    type="text"
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                    placeholder="e.g. UTR not found in bank statement / Incorrect payment amount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingRequest(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isActionInProgress}
                    onClick={handleConfirmReject}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* Requests List */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-600" />
                  <p>No payment requests found in "{requestFilter}" filter.</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req.id} className="p-4 hover:bg-slate-900/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-sm text-white">@{req.userId}</span>
                        <span className="text-xs text-slate-300 font-semibold">({req.userName})</span>
                        
                        <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
                          {req.planName} • ₹{req.amountPaid}
                        </span>

                        <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800 font-mono">
                          {req.paymentApp.toUpperCase()}
                        </span>

                        {req.status === 'approved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Approved & Active</span>
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                      </div>

                      {/* 12-Digit UTR Display Highlight */}
                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-750 font-mono">
                          <span className="text-slate-400 text-[10px]">12-Digit UTR:</span>
                          <strong className="text-amber-300 text-sm">{req.utrNumber}</strong>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(req.utrNumber);
                                showToast(`Copied UTR: ${req.utrNumber}`);
                              }
                            }}
                            className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                            title="Copy UTR"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-slate-500">•</span>
                        <span className="text-[11px] text-slate-400">
                          Submitted: {new Date(req.createdAt).toLocaleString()}
                        </span>

                        {req.notes && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 italic text-[11px]">Note: "{req.notes}"</span>
                          </>
                        )}
                      </div>

                      {req.rejectionReason && (
                        <div className="text-xs text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-800/40">
                          Rejection Reason: {req.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={isActionInProgress}
                            onClick={() => handleApproveRequest(req)}
                            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Verify & Grant Access</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectionReasonText('');
                            }}
                            className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl border border-rose-800/60 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          {req.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(req)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Re-Approve
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: User Messages, Support Tickets & Inquiries */}
        {activeTab === 'messages' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Header info banner */}
            <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>User Messages, Support Inquiries & ID Card Requests</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    Total: {userMessages.length}
                  </span>
                  {unreadMessagesCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse">
                      {unreadMessagesCount} Unread
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Review inquiries, custom ID card requests, and support queries sent by operators and guests. Replies are synced in real-time to the user's screen.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMsgFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    msgFilter === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({userMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMsgFilter('unread')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    msgFilter === 'unread'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadMessagesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMsgFilter('replied')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    msgFilter === 'replied'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Replied ({userMessages.filter(m => m.status === 'replied').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMsgFilter('resolved')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    msgFilter === 'resolved'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resolved ({userMessages.filter(m => m.status === 'resolved').length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder="Search name, phone, msg..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Messages List */}
            <div className="space-y-4">
              {filteredUserMessages.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto text-slate-600 opacity-40" />
                  <p className="text-sm font-semibold text-slate-400">No user messages found</p>
                  <p className="text-xs text-slate-500">
                    {msgSearch ? 'Try a different search keyword.' : 'When users click "Message Admin" to send inquiries or requests, they will appear here in real-time.'}
                  </p>
                </div>
              ) : (
                filteredUserMessages.map((msg) => {
                  const cleanPhone = msg.userMobile ? msg.userMobile.replace(/[^0-9]/g, '') : '';
                  const isReplying = activeReplyId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`p-5 rounded-2xl border transition space-y-4 ${
                        msg.status === 'unread'
                          ? 'bg-slate-950 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top bar: Subject & Status */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white tracking-wide">
                              {msg.subject || 'User Support Inquiry'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono capitalize">
                              {msg.category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-white font-semibold">
                              <User className="w-3.5 h-3.5 text-blue-400" />
                              <span>{msg.userName}</span>
                              {msg.userId && msg.userId !== 'guest_user' && (
                                <span className="text-[11px] text-slate-400 font-mono">(@{msg.userId})</span>
                              )}
                            </span>

                            {msg.userMobile && (
                              <span className="flex items-center gap-1 font-mono text-emerald-400">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{msg.userMobile}</span>
                              </span>
                            )}

                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(msg.createdAt).toLocaleString()}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {msg.status === 'unread' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span>Unread Message</span>
                            </span>
                          )}
                          {msg.status === 'read' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                              Read
                            </span>
                          )}
                          {msg.status === 'replied' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Replied</span>
                            </span>
                          )}
                          {msg.status === 'resolved' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-blue-400" />
                              <span>Resolved</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Device HWID if available */}
                      {msg.hardwareId && (
                        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-slate-400">Attached Device MAC / HWID:</span>
                            <code className="font-mono text-cyan-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/30">
                              {msg.hardwareId}
                            </code>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.hardwareId!, 'Device HWID')}
                            className="p-1 hover:text-white text-slate-400 cursor-pointer"
                            title="Copy HWID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* User's Message Text */}
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </div>

                      {/* Admin Reply Display if already replied */}
                      {msg.adminReply && !isReplying && (
                        <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-600/40 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold flex-wrap gap-2">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Your Reply ({msg.repliedBy || 'Admin'}):</span>
                            </span>
                            {msg.repliedAt && (
                              <span className="text-[10px] text-emerald-500/80 font-normal">
                                {new Date(msg.repliedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-100 whitespace-pre-wrap leading-relaxed">
                            {msg.adminReply}
                          </p>
                        </div>
                      )}

                      {/* Inline Reply Form */}
                      {isReplying && (
                        <div className="p-3.5 bg-slate-900 rounded-xl border border-amber-500/50 space-y-3">
                          <label className="block text-xs font-bold text-amber-300">
                            Reply to {msg.userName}:
                          </label>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            placeholder="Type your reply message here (user will see this live on their screen)..."
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none resize-none"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSendingReply}
                              onClick={() => handleSendAdminReply(msg.id)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isSendingReply ? 'Sending...' : 'Send Reply'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 flex-wrap gap-2">
                        {/* External Contact Shortcuts */}
                        <div className="flex items-center gap-2">
                          {cleanPhone && (
                            <>
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-semibold transition"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-400" />
                                <span>WhatsApp</span>
                              </a>

                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 text-[11px] font-semibold transition"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>Call</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => copyToClipboard(cleanPhone, 'Phone Number')}
                                className="p-1 hover:text-white text-slate-400 cursor-pointer"
                                title="Copy Phone Number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Status & Reply Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isReplying && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyId(msg.id);
                                setReplyText(msg.adminReply || '');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Send className="w-3 h-3" />
                              <span>{msg.adminReply ? 'Edit Reply' : 'Reply'}</span>
                            </button>
                          )}

                          {msg.status === 'unread' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateMsgStatus(msg.id, 'read')}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                            >
                              Mark Read
                            </button>
                          )}

                          {msg.status !== 'resolved' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateMsgStatus(msg.id, 'resolved')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateMsgStatus(msg.id, 'read')}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                            >
                              Reopen
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteUserMsg(msg.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            title="Delete Message Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: UPI & Plan Pricing Configuration */}
        {activeTab === 'pricing' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>UPI Payment Gateway & Subscription Plan Pricing Configuration</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure your Merchant / Shop UPI ID, Payee Name, instructions, and customizable plan pricing. The application automatically renders high-resolution offline UPI QR codes and handles instant UTR approval submissions.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-5">
              
              {/* UPI ID & Payee Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Admin UPI ID (VPA) *</span>
                    <span className="text-[10px] text-amber-400 font-mono">e.g. biswasxerox40@okaxis</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value)}
                      placeholder="e.g. biswasxerox40@okaxis"
                      className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Payee Name / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPayeeName}
                    onChange={(e) => setEditPayeeName(e.target.value)}
                    placeholder="e.g. Biswas Xerox Centre"
                    className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    QR Transaction Note Prefix
                  </label>
                  <input
                    type="text"
                    value={editQrNote}
                    onChange={(e) => setEditQrNote(e.target.value)}
                    placeholder="e.g. Sayonika PVC Pro Subscription"
                    className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Instructions for User
                  </label>
                  <input
                    type="text"
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    placeholder="e.g. Scan QR, pay with GPay/PhonePe, enter 12-digit UTR below."
                    className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Plans Pricing Manager */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span>Manage Subscription Plans & Prices</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Custom prices apply immediately to all operators</span>
                </div>

                <div className="space-y-2.5">
                  {editPlans.map((plan, idx) => (
                    <div key={plan.id} className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{plan.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({plan.days > 0 ? `${plan.days} Days` : 'Lifetime Access'})
                          </span>
                          {plan.tag && (
                            <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                              {plan.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{plan.description}</p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-750">
                          <span className="text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min={0}
                            value={plan.priceInr}
                            onChange={(e) => handleUpdatePlanPrice(idx, Number(e.target.value))}
                            className="w-20 bg-transparent text-amber-300 font-extrabold text-xs outline-none font-mono"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">INR</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTogglePlanEnabled(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            plan.isEnabled !== false
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {plan.isEnabled !== false ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPricing}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPricing ? 'Saving Pricing Setup...' : 'Save UPI & Plan Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: Telegram Contact Button & Message Box Configuration */}
        {activeTab === 'telegram' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                <Send className="w-4 h-4 text-sky-400" />
                <span>Custom Telegram Contact Button & Login Message Box</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure the direct Telegram support button and custom contact notice displayed on the Login Screen. Operators and new users who register can click this button to message you directly for quick subscription activation.
              </p>
            </div>

            <form onSubmit={handleSaveTelegramConfig} className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Telegram Link URL */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Telegram Button Link URL *</span>
                    <span className="text-[11px] text-sky-400 font-mono">e.g. https://t.me/BiswasXerox or https://t.me/+919876543210</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-400">
                      <Send className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      required
                      value={telegramLink}
                      onChange={(e) => setTelegramLink(e.target.value)}
                      placeholder="https://t.me/your_telegram_username"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                {/* Button Display Text */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Button Label Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={telegramBtnText}
                    onChange={(e) => setTelegramBtnText(e.target.value)}
                    placeholder="e.g. Contact Admin on Telegram"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500"
                  />
                </div>

                {/* Telegram Username Tag */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Telegram Handle / Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="e.g. @BiswasXerox"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 font-mono"
                  />
                </div>

                {/* Custom Admin Message Box */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Custom Message Box Content (Shown on Login Screen)
                  </label>
                  <textarea
                    rows={3}
                    value={adminContactMessage}
                    onChange={(e) => setAdminContactMessage(e.target.value)}
                    placeholder="Explain how users can get approval, subscription costs, or support hours..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingTelegram ? 'Saving Settings...' : 'Save & Publish Telegram Button'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: Public Access Configuration */}
        {activeTab === 'public' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className={`p-5 rounded-xl border transition-all shadow-lg ${
              securityConfig.publicAccessEnabled
                ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border-emerald-500/50'
                : 'bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-blue-950/40 border-slate-750'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                    securityConfig.publicAccessEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {securityConfig.publicAccessEnabled ? (
                      <Unlock className="w-6 h-6" />
                    ) : (
                      <Lock className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Public Open Access Mode:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        securityConfig.publicAccessEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {securityConfig.publicAccessEnabled ? 'ENABLED (OPEN ACCESS)' : 'DISABLED (STRICT LOGIN)'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      {securityConfig.publicAccessEnabled ? (
                        <span className="text-emerald-200/90">
                          Anyone visiting this web application link can open and use all PVC ID printing tools directly without entering credentials.
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Strict authentication is required. Only authorized users with active subscriptions can log in.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePublicAccess}
                  disabled={isTogglingPublic}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                    securityConfig.publicAccessEnabled
                      ? 'bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 shadow-red-950/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-emerald-600/30'
                  } active:scale-95 disabled:opacity-50`}
                >
                  {isTogglingPublic ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : securityConfig.publicAccessEnabled ? (
                    <>
                      <Lock className="w-4 h-4 text-red-300" />
                      <span>Switch to Strict Login Mode</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-emerald-100" />
                      <span>Enable Open Public Access</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Hardware Diagnostics & Device Control */}
        {activeTab === 'hardware' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header / Intro Card */}
            <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <span>Machine Hardware Diagnostics & Device Control Console</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 font-bold">
                    Real-Time Telemetry
                  </span>
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Real-time physical MAC detection, cryptographic hardware seeds, binding assignments, and admin firewall controls to block unauthorized computers.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRefreshHardwareBinding}
                  disabled={isRefreshingHardware}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Re-run hardware detection and verify live bindings"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingHardware ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingHardware ? 'Refreshing...' : 'Refresh Binding'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReRegisterDeviceId}
                  disabled={isReRegisteringHardware}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Clear local device seed and regenerate a fresh cryptographic hardware ID"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isReRegisteringHardware ? 'animate-spin' : ''}`} />
                  <span>Re-register Device ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualMacModalInput(localHardware?.macAddress || '');
                    setShowManualMacModal(true);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                  title="Enter physical NIC MAC address manually from Windows getmac /v"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Set Physical MAC</span>
                </button>

                {localHardware?.isManualOverride && (
                  <button
                    type="button"
                    onClick={handleClearManualMacOverride}
                    className="px-3 py-2 bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-700/50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    title="Remove manual override and return to auto-detected system MAC"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset to Auto-detect</span>
                  </button>
                )}
              </div>
            </div>

            {/* DIAGNOSTIC PANEL: Current Machine Details & Live Assignment */}
            {localHardware ? (
              (() => {
                const boundUserForThisMachine = users.find(u => u.boundHardwareId && normalizeMacAddress(u.boundHardwareId) === normalizeMacAddress(localHardware.macAddress));
                const isThisMachineBlocked = isDeviceHardwareBlocked(localHardware.macAddress, securityConfig.blockedHardwareIds);

                return (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Current Machine Telemetry & Hardware Fingerprint
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {isThisMachineBlocked ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-600 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>⛔ BLACKLISTED / BLOCKED MACHINE</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>🟢 SYSTEM ACCESS AUTHORIZED</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4 Telemetry Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Metric 1: Physical / Effective MAC */}
                      <div className="p-3.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>Physical / Effective MAC</span>
                          <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="flex items-center justify-between">
                          <code className="text-cyan-200 font-mono font-bold text-sm tracking-wider">
                            {localHardware.macAddress}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(localHardware.macAddress, 'Current MAC')}
                            className="p-1 hover:bg-slate-800 text-cyan-400 hover:text-white rounded cursor-pointer"
                            title="Copy MAC"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {localHardware.isManualOverride ? (
                            <span className="text-amber-300 font-bold">⚡ Manual Physical Override Active</span>
                          ) : (
                            <span className="text-emerald-400">🛡️ Auto-Synthesized Hardware MAC</span>
                          )}
                        </div>
                      </div>

                      {/* Metric 2: CPU & Logical Processors */}
                      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>CPU & Architecture</span>
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="text-sm font-bold text-white">
                          {localHardware.cpuCores ? `${localHardware.cpuCores} Logical Cores` : 'Multi-Core CPU'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Platform: <strong className="text-slate-300">{localHardware.platform || localHardware.osPlatform || 'PC'}</strong>
                        </div>
                      </div>

                      {/* Metric 3: Machine Assignment Status */}
                      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>Account Binding</span>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        {boundUserForThisMachine ? (
                          <>
                            <div className="text-xs font-bold text-emerald-300 truncate">
                              @{boundUserForThisMachine.userId}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {boundUserForThisMachine.name} ({boundUserForThisMachine.role})
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-amber-300">
                              Standalone PC
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Not locked to any single user
                            </div>
                          </>
                        )}
                      </div>

                      {/* Metric 4: Access Control Action */}
                      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                          <span>Firewall Action</span>
                          <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <button
                          type="button"
                          onClick={() => isThisMachineBlocked ? handleUnblockDevice(localHardware.macAddress) : handleBlockDevice(localHardware.macAddress, 'Blocked via Diagnostic Panel Toggle', 'Current Machine')}
                          disabled={togglingBlockMac === localHardware.macAddress || isBlockingSubmitting}
                          className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                            isThisMachineBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60'
                          }`}
                        >
                          {isThisMachineBlocked ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Unblock This PC</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block This PC</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Extended Telemetry Drawer */}
                    <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400">GPU Renderer:</span>
                        <div className="font-mono text-slate-300 truncate mt-0.5">
                          {localHardware.renderer || 'WebGL Canvas Engine'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Display Resolution & Scale:</span>
                        <div className="font-mono text-slate-300 truncate mt-0.5">
                          {localHardware.screenResolution || 'Standard Display'} (PixelRatio: {localHardware.devicePixelRatio || 1}x)
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Cryptographic Hardware Seed Hash:</span>
                        <div className="font-mono text-cyan-300 truncate mt-0.5 flex items-center gap-1">
                          <span>{(localHardware.hardwareHash || localHardware.hardwareId || 'N/A').slice(0, 20)}...</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(localHardware.hardwareHash || localHardware.hardwareId || '', 'Hardware Hash')}
                            className="p-0.5 text-cyan-400 hover:text-white rounded cursor-pointer"
                            title="Copy Full Hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Machine Assignment Control Bar */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {boundUserForThisMachine ? (
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300">
                            Currently locked to account: <strong className="text-emerald-300">{boundUserForThisMachine.name} (@{boundUserForThisMachine.userId})</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClearUserHardwareBinding(boundUserForThisMachine.userId, boundUserForThisMachine.name)}
                            disabled={clearingBindingUserId === boundUserForThisMachine.userId}
                            className="px-3 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Clear / Remove Binding</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span className="text-slate-400">Quickly bind this machine to an account:</span>
                          <select
                            value={bindSelectedUserForCurrentPc}
                            onChange={(e) => setBindSelectedUserForCurrentPc(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500"
                          >
                            <option value="">-- Select Operator Account --</option>
                            {users.filter(u => u.role !== 'admin').map((u) => (
                              <option key={u.userId} value={u.userId}>
                                {u.name} (@{u.userId}) {u.boundHardwareId ? `[Already bound]` : `[Unbound]`}
                              </option>
                            ))}
                          </select>
                          {bindSelectedUserForCurrentPc && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetUser = users.find(u => u.userId === bindSelectedUserForCurrentPc);
                                if (targetUser) handleQuickBindCurrentPc(targetUser);
                              }}
                              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Bind This PC Now</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                Detecting device hardware telemetry...
              </div>
            )}

            {/* SECTION 2: Global Hardware Blocklist / Firewall */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Global Device Blacklist & Hardware Firewall</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Blacklisted hardware IDs (MAC/CPU) are completely forbidden from logging into ANY operator account on this platform.
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-xs font-bold">
                  {(securityConfig.blockedHardwareIds || []).length} Devices Blocked
                </div>
              </div>

              {/* Manual Device Blacklist Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!blockInputMac.trim()) {
                    showToast('Please specify a Device MAC Address to block.');
                    return;
                  }
                  handleBlockDevice(blockInputMac, blockInputReason, blockInputLabel);
                }}
                className="p-4 bg-slate-900/70 rounded-xl border border-rose-900/40 space-y-3"
              >
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>Block a Specific Device Hardware ID / MAC:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Device MAC Address / Hardware ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={blockInputMac}
                      onChange={(e) => setBlockInputMac(e.target.value)}
                      placeholder="e.g. 00:1A:2B:3C:4D:5E"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-3 py-1.5 text-xs text-rose-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Machine Label / Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={blockInputLabel}
                      onChange={(e) => setBlockInputLabel(e.target.value)}
                      placeholder="e.g. Rogue Counter Laptop"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Reason for Blocking (Optional)
                    </label>
                    <input
                      type="text"
                      value={blockInputReason}
                      onChange={(e) => setBlockInputReason(e.target.value)}
                      placeholder="e.g. Unauthorized access attempt"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isBlockingSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isBlockingSubmitting ? 'Blocking...' : 'Block Device ID'}</span>
                  </button>
                </div>
              </form>

              {/* Blocked Devices Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 divide-y divide-slate-800">
                {(!securityConfig.blockedHardwareIds || securityConfig.blockedHardwareIds.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No devices are currently blacklisted. All authorized operator computers can log in.
                  </div>
                ) : (
                  securityConfig.blockedHardwareIds.map((blockedMac) => {
                    const normBlocked = normalizeMacAddress(blockedMac);
                    const meta = (securityConfig.blockedDevicesList || []).find(
                      (d) => normalizeMacAddress(d.hardwareId) === normBlocked
                    );
                    const isThisMachine = localHardware && normalizeMacAddress(localHardware.macAddress) === normBlocked;

                    return (
                      <div
                        key={blockedMac}
                        className="p-3 hover:bg-slate-900/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-rose-300 text-sm">
                              {blockedMac}
                            </span>
                            {meta?.label && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {meta.label}
                              </span>
                            )}
                            {isThisMachine && (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-600 text-[10px] font-bold animate-pulse">
                                THIS PC ⚠️
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(blockedMac, 'Blocked MAC')}
                              className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
                              title="Copy MAC"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Reason: <strong className="text-slate-300">{meta?.reason || 'Blocked by Administrator'}</strong>
                            {meta?.blockedAt ? (
                              <span> • Blocked on: {new Date(meta.blockedAt).toLocaleDateString()}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUnblockDevice(blockedMac)}
                            disabled={togglingBlockMac === blockedMac}
                            className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/60 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Unblock Device</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SECTION 3: All Registered User Device Bindings */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-cyan-400" />
                    <span>Registered Operator PC Bindings Directory</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Accounts locked to specific computers. Administrators can clear hardware bindings or block rogue machines with 1 click.
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold">
                  {users.filter(u => u.boundHardwareId).length} Bound Accounts
                </div>
              </div>

              {/* Bound Users Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 divide-y divide-slate-800">
                {users.filter(u => u.boundHardwareId || u.isPcBindingEnabled).length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No operator accounts currently have PC binding enabled.
                  </div>
                ) : (
                  users.filter(u => u.boundHardwareId || u.isPcBindingEnabled).map((u) => {
                    const isBlocked = u.boundHardwareId
                      ? isDeviceHardwareBlocked(u.boundHardwareId, securityConfig.blockedHardwareIds)
                      : false;
                    const isThisMachine = localHardware && u.boundHardwareId && normalizeMacAddress(localHardware.macAddress) === normalizeMacAddress(u.boundHardwareId);

                    return (
                      <div
                        key={u.userId}
                        className="p-3.5 hover:bg-slate-900/60 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">@{u.userId}</span>
                            <span className="text-slate-300 font-medium">({u.name})</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                              {u.role}
                            </span>
                            {isThisMachine && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                THIS PC ✅
                              </span>
                            )}
                            {isBlocked && (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>BLOCKED DEVICE</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] flex-wrap">
                            {u.boundHardwareId ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Bound MAC:</span>
                                <code className="font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/30">
                                  {u.boundHardwareId}
                                </code>
                                {u.boundHardwareLabel && (
                                  <span className="text-slate-400">({u.boundHardwareLabel})</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(u.boundHardwareId!, 'MAC Address')}
                                  className="p-0.5 hover:text-white text-slate-400 rounded cursor-pointer"
                                  title="Copy Bound MAC"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-amber-300">
                                🔒 PC Lock Enabled: Will automatically bind to operator's PC on their first login
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions for this user's machine */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Clear / Unbind Button */}
                          {u.boundHardwareId && (
                            <button
                              type="button"
                              onClick={() => handleClearUserHardwareBinding(u.userId, u.name)}
                              disabled={clearingBindingUserId === u.userId}
                              className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-700/50 rounded-lg text-xs font-bold flex items-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                              title="Clear hardware lock for this account"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Clear Binding</span>
                            </button>
                          )}

                          {/* Block / Unblock Toggle */}
                          {u.boundHardwareId && (
                            <button
                              type="button"
                              onClick={() => isBlocked ? handleUnblockDevice(u.boundHardwareId!) : handleBlockDevice(u.boundHardwareId!, `Blocked from user binding @${u.userId}`, u.name)}
                              disabled={togglingBlockMac === u.boundHardwareId}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                                isBlocked
                                  ? 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-500'
                                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                              }`}
                              title={isBlocked ? 'Unblock this machine' : 'Block this machine globally'}
                            >
                              {isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              <span>{isBlocked ? 'Unblock' : 'Block Device'}</span>
                            </button>
                          )}

                          {/* Re-configure Binding Button */}
                          <button
                            type="button"
                            onClick={() => openHardwareModal(u)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
                          >
                            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Single-Session Security Policy & Subscription Expiry Active.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>

      {/* In-Modal Permanent Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Permanently Delete Account?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete user <strong className="text-red-300 font-mono">@{userToDelete.userId}</strong> ({userToDelete.name})?
              </p>
              <p className="text-[11px] text-slate-500">
                This account will be permanently removed from the database and all active sessions will be terminated. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HARDWARE / PC MAC BINDING MODAL */}
      {userToBindPc && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>PC Hardware Binding Lock</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Operator: <strong className="text-cyan-300">@{userToBindPc.userId}</strong> ({userToBindPc.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToBindPc(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHardwareBinding} className="space-y-4">
              {/* Enforce PC Binding Checkbox */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bindEnforceToggle}
                    onChange={(e) => setBindEnforceToggle(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-cyan-500 text-cyan-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Strict PC Hardware Lock</span>
                    <span className="text-[11px] text-slate-400 leading-normal block">
                      When enabled, this operator can only log in from this specific physical machine. Logins from any other computer will be blocked.
                    </span>
                  </div>
                </label>
              </div>

              {/* Bound Hardware MAC / ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Target PC MAC Address / Hardware Identifier *
                  </label>
                  {localHardware?.macAddress && (
                    <button
                      type="button"
                      onClick={() => setBindMacInput(localHardware.macAddress)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                    >
                      Use This Computer's MAC ({localHardware.macAddress})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required={bindEnforceToggle}
                  value={bindMacInput}
                  onChange={(e) => setBindMacInput(e.target.value)}
                  placeholder="e.g. 00:1A:2B:3C:4D:5E or leave empty to auto-bind on next login"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono"
                />
              </div>

              {/* PC Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  PC Name / Machine Label (Optional)
                </label>
                <input
                  type="text"
                  value={bindLabelInput}
                  onChange={(e) => setBindLabelInput(e.target.value)}
                  placeholder="e.g. Counter 1 Desktop / Epson Printer PC"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Last seen MAC info if available */}
              {userToBindPc.lastSeenHardwareId && (
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                  <span>Last login attempt detected MAC: <code className="text-cyan-300 font-mono font-bold">{userToBindPc.lastSeenHardwareId}</code></span>
                  <button
                    type="button"
                    onClick={() => setBindMacInput(userToBindPc.lastSeenHardwareId!)}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Use This
                  </button>
                </div>
              )}

              {/* Command Reference Helper for Windows */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to find physical MAC in Windows CMD / PowerShell:</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 font-mono text-cyan-300 text-[11px]">
                  <code>{HARDWARE_HELP_COMMANDS.windowsGetMac}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(HARDWARE_HELP_COMMANDS.windowsGetMac, 'CMD Command')}
                    className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {userToBindPc.boundHardwareId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleUnbindUserPc(userToBindPc);
                      setUserToBindPc(null);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Unbind / Clear PC</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserToBindPc(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBindingSubmitting}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>{isBindingSubmitting ? 'Saving...' : 'Save PC Binding'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Physical NIC MAC Override Modal */}
      {showManualMacModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-cyan-500/50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manual Physical NIC MAC Override</h3>
                  <p className="text-[11px] text-slate-400">
                    Set a real physical network adapter MAC from your Windows command prompt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualMacModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyManualMacOverride(manualMacModalInput);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Physical Network Card MAC Address *
                </label>
                <input
                  type="text"
                  required
                  value={manualMacModalInput}
                  onChange={(e) => setManualMacModalInput(e.target.value)}
                  placeholder="e.g. 00-1A-2B-3C-4D-5E or 00:1A:2B:3C:4D:5E"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono tracking-wider font-bold"
                />
              </div>

              {/* Windows CMD instructions */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to find your Physical MAC on Windows:</span>
                </div>
                <p>Run this command in Command Prompt (cmd.exe) and copy the Physical Address:</p>
                <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-cyan-300 flex items-center justify-between">
                  <code>{HARDWARE_HELP_COMMANDS.windowsGetMac}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(HARDWARE_HELP_COMMANDS.windowsGetMac, 'CMD Command')}
                    className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualMacModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Physical MAC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
