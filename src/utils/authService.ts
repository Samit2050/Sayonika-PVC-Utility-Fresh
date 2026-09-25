import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  getDetectedHardwareId, 
  normalizeMacAddress, 
  getDeviceHardwareInfo, 
  DeviceHardwareInfo,
  HARDWARE_HELP_COMMANDS 
} from './deviceIdentifier';

export interface AppUser {
  userId: string;
  name: string;
  password?: string;
  mobileNumber?: string;
  role: 'admin' | 'operator' | 'user';
  isAllowed: boolean;
  isApproved?: boolean; // false for pending self-registrations until admin approves
  subscriptionType?: 'lifetime' | 'days' | 'custom_date' | 'trial';
  subscriptionDays?: number; // configured number of days
  subscriptionExpiresAt?: number | null; // timestamp in ms; 0 or null = lifetime / never expires
  subscriptionApprovedAt?: number;
  activeSessionToken?: string;
  boundHardwareId?: string; // Bound PC MAC address, CPU ID, or Hardware Identifier
  isPcBindingEnabled?: boolean; // When true, access is locked exclusively to boundHardwareId
  boundHardwareLabel?: string; // Optional nickname for the PC (e.g. "Counter 1 Desktop")
  boundAt?: number; // Timestamp when bound
  lastSeenHardwareId?: string; // Last observed hardware MAC ID on login attempt
  lastLoginAt?: number;
  lastActiveAt?: number;
  lastLoginDevice?: string;
  notes?: string;
  createdAt: number;
}

export interface AuthSession {
  userId: string;
  name: string;
  role: 'admin' | 'operator' | 'user';
  sessionToken: string;
  loginTime: number;
  isPublicGuest?: boolean;
  subscriptionExpiresAt?: number | null;
}

export interface BlockedHardwareDevice {
  hardwareId: string;
  blockedAt: number;
  reason?: string;
  blockedBy?: string;
  label?: string;
}

export interface SystemSecurityConfig {
  publicAccessEnabled: boolean;
  isLoginRequired?: boolean;
  shopName?: string;
  telegramLink?: string; // e.g. "https://t.me/BiswasXerox"
  telegramButtonText?: string; // e.g. "Contact Admin on Telegram"
  telegramUsername?: string; // e.g. "@BiswasXerox"
  adminContactMessage?: string; // customizable message box for login screen
  adminContactPhone?: string; // optional phone / whatsapp
  blockedHardwareIds?: string[]; // list of normalized blocked MAC / CPU hardware identifiers
  blockedDevicesList?: BlockedHardwareDevice[]; // rich history of blocked hardware devices
  updatedBy?: string;
  updatedAt?: number;
}

export const GUEST_PUBLIC_SESSION: AuthSession = {
  userId: 'public_guest',
  name: 'Public Operator (Direct Access)',
  role: 'operator',
  sessionToken: 'public_open_access_token',
  loginTime: Date.now(),
  isPublicGuest: true,
  subscriptionExpiresAt: null,
};

export const DEFAULT_SECURITY_CONFIG: SystemSecurityConfig = {
  publicAccessEnabled: false,
  isLoginRequired: true,
  shopName: 'Sayonika PVC Utility',
  telegramLink: 'https://t.me/BiswasXerox',
  telegramButtonText: 'Contact Admin on Telegram',
  telegramUsername: '@BiswasXerox',
  adminContactMessage: 'To activate your account, get subscriptions, or report issues, contact Administrator directly on Telegram.',
  adminContactPhone: '+91 98765 43210',
  blockedHardwareIds: [],
  blockedDevicesList: [],
  updatedBy: 'Admin',
  updatedAt: Date.now(),
};

const SECURITY_CONFIG_CACHE_KEY = 'sayonika_security_config_cache_v2';

export function getLocalSecurityConfig(): SystemSecurityConfig {
  try {
    const raw = localStorage.getItem(SECURITY_CONFIG_CACHE_KEY);
    if (!raw) return DEFAULT_SECURITY_CONFIG;
    return { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SECURITY_CONFIG;
  }
}

export function saveLocalSecurityConfig(cfg: SystemSecurityConfig): void {
  try {
    localStorage.setItem(SECURITY_CONFIG_CACHE_KEY, JSON.stringify(cfg));
  } catch {}
}

const SESSION_STORAGE_KEY = 'sayonika_auth_session_v1';
const USERS_COLLECTION = 'users';
const CONFIG_COLLECTION = 'system_config';
const MAIN_CONFIG_DOC = 'general_security';

/**
 * Generate unique session token for single-login validation
 */
export function generateSessionToken(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Clean & normalize username / ID
 */
export function normalizeUserId(rawId: string): string {
  return rawId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

/**
 * Seed default Master Admin account if the database is freshly initialized or updated
 */
export async function ensureDefaultAdminExists(): Promise<void> {
  try {
    // 1. Seed or ensure primary Master Admin 'samit'
    const samitDocRef = doc(db, USERS_COLLECTION, 'samit');
    const samitSnap = await getDoc(samitDocRef);

    if (!samitSnap.exists()) {
      const samitAdmin: AppUser = {
        userId: 'samit',
        name: 'Samit Biswas (Master Admin)',
        password: 'Biswas2026Samit',
        role: 'admin',
        isAllowed: true,
        notes: 'Primary Shop Administrator & Developer with Full Access',
        createdAt: Date.now(),
      };
      await setDoc(samitDocRef, samitAdmin);
    } else {
      // Ensure samit has admin role and is allowed
      const data = samitSnap.data() as AppUser;
      if (!data.isAllowed || data.role !== 'admin' || !data.password) {
        await updateDoc(samitDocRef, {
          role: 'admin',
          isAllowed: true,
          password: data.password || 'Biswas2026Samit'
        });
      }
    }

    // 2. Also ensure fallback/secondary admin
    const adminDocRef = doc(db, USERS_COLLECTION, 'admin');
    const adminSnap = await getDoc(adminDocRef);

    if (!adminSnap.exists()) {
      const defaultAdmin: AppUser = {
        userId: 'admin',
        name: 'Administrator (Biswas Xerox)',
        password: 'Biswas2026Samit',
        role: 'admin',
        isAllowed: true,
        notes: 'Backup Admin Account',
        createdAt: Date.now(),
      };
      await setDoc(adminDocRef, defaultAdmin);
    }
  } catch (err) {
    console.error('Failed to ensure default admin user:', err);
  }
}

/**
 * Register a new user via Self-Registration using 10-digit Mobile Number as UID
 * - Automatically approved: no admin approval required
 * - Automatically bound to the registering device PC / MAC ID
 * - Automatically granted 10-day free trial subscription
 */
export async function registerSelfUser(data: {
  mobileNumber: string;
  name: string;
  password: string;
  hardwareId?: string;
}): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  try {
    await ensureDefaultAdminExists();

    const rawMobile = (data.mobileNumber || '').replace(/\D/g, '');
    if (rawMobile.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number for your User ID.' };
    }
    const normalizedMobileId = rawMobile.slice(-10); // Standard 10-digit mobile UID

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: 'Please enter your Full Name or Shop Name.' };
    }

    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const docRef = doc(db, USERS_COLLECTION, normalizedMobileId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { 
        success: false, 
        error: `Mobile number ${normalizedMobileId} is already registered. Please sign in with your password.` 
      };
    }

    // Capture detected hardware MAC / PC ID of the registering device
    const detectedHardwareId = data.hardwareId ? normalizeMacAddress(data.hardwareId) : await getDetectedHardwareId();

    const now = Date.now();
    const trialDays = 10;
    const trialExpiresAt = now + trialDays * 24 * 60 * 60 * 1000; // Exactly 10 days free trial

    const newUser: AppUser = {
      userId: normalizedMobileId,
      name: data.name.trim(),
      mobileNumber: normalizedMobileId,
      password: data.password,
      role: 'operator',
      isAllowed: true, // APPROVED AUTOMATICALLY - No admin approval required
      isApproved: true, // Auto-approved
      subscriptionType: 'trial',
      subscriptionDays: trialDays,
      subscriptionExpiresAt: trialExpiresAt,
      subscriptionApprovedAt: now,
      boundHardwareId: detectedHardwareId, // Automatically bound to this PC device MAC ID
      isPcBindingEnabled: true, // Locked to this registered device
      boundHardwareLabel: `Registered PC (${detectedHardwareId})`,
      boundAt: now,
      lastSeenHardwareId: detectedHardwareId,
      notes: `Self-registered on ${new Date().toLocaleDateString()}. Auto-approved 10-day free trial bound to PC MAC: ${detectedHardwareId}`,
      createdAt: now,
    };

    await setDoc(docRef, newUser);
    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Self registration error:', err);
    return { success: false, error: err.message || 'Self-registration failed due to connection error.' };
  }
}

/**
 * Attempt user login with ID + Password check, Authorization status check, Expiry validation,
 * PC-Binding MAC check, and generate a new Session Token
 */
export async function authenticateUser(
  userIdRaw: string, 
  passwordRaw: string,
  customHardwareId?: string
): Promise<{ 
  success: boolean; 
  session?: AuthSession; 
  error?: string; 
  code?: string; 
  isPendingApproval?: boolean; 
  isExpired?: boolean; 
  isPcBindingMismatch?: boolean;
  isDeviceBlocked?: boolean;
  user?: AppUser;
  currentHardwareId?: string;
  boundHardwareId?: string;
}> {
  try {
    await ensureDefaultAdminExists();

    const normalizedId = normalizeUserId(userIdRaw);
    if (!normalizedId) {
      return { success: false, error: 'Please enter a valid User ID / Mobile Number.' };
    }

    if (!passwordRaw) {
      return { success: false, error: 'Please enter your password.' };
    }

    const userDocRef = doc(db, USERS_COLLECTION, normalizedId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return { 
        success: false, 
        error: 'User ID not found. If you are a new operator, please register first using your Mobile Number.',
        code: 'USER_NOT_FOUND'
      };
    }

    const userData = userSnap.data() as AppUser;

    // 1. Password Verification
    if (userData.password !== passwordRaw) {
      return { 
        success: false, 
        error: 'Incorrect password. Please verify your credentials.',
        code: 'INVALID_PASSWORD',
        user: userData
      };
    }

    // 2. Pending Admin Approval Check (For Self-Registered accounts)
    if (userData.isApproved === false || (!userData.isAllowed && userData.role !== 'admin')) {
      // Check if it is purely pending approval or manually blocked
      if (userData.isApproved === false) {
        return { 
          success: false, 
          error: '⏳ Approval Pending: Your account has been registered, but login access has not been approved yet by the Admin. Please contact Administrator on Telegram to activate your subscription.',
          code: 'APPROVAL_PENDING',
          isPendingApproval: true,
          user: userData
        };
      }

      return { 
        success: false, 
        error: 'Access Denied: Your account is currently disabled or blocked by the Administrator.',
        code: 'ACCESS_DENIED',
        user: userData
      };
    }

    // 3. Subscription Expiry Check (Auto-disable if subscription has expired)
    if (userData.role !== 'admin' && userData.subscriptionExpiresAt && userData.subscriptionExpiresAt > 0) {
      const now = Date.now();
      if (now > userData.subscriptionExpiresAt) {
        // Auto-disable in database
        await updateDoc(userDocRef, {
          isAllowed: false,
          activeSessionToken: ''
        });

        const expiredDateStr = new Date(userData.subscriptionExpiresAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const isTrial = userData.subscriptionType === 'trial' || userData.subscriptionDays === 10;
        const msg = isTrial
          ? `⛔ 10-Day Free Trial Expired: Your trial ended on ${expiredDateStr}. An active subscription is required to continue using the application. Please contact Administrator or submit payment to renew.`
          : `⛔ Subscription Expired: Your access expired on ${expiredDateStr}. An active subscription is required to continue using the application. Please contact Administrator to renew.`;

        return {
          success: false,
          error: msg,
          code: 'SUBSCRIPTION_EXPIRED',
          isExpired: true,
          user: userData
        };
      }
    }

    // 4. PC Hardware Binding Verification & Device Blacklist Check
    const currentHardwareId = customHardwareId 
      ? normalizeMacAddress(customHardwareId) 
      : await getDetectedHardwareId();

    const secConfig = await getSecurityConfig();
    const currentNorm = normalizeMacAddress(currentHardwareId);
    const isHardwareBlocked = (secConfig.blockedHardwareIds || []).some(
      (b) => normalizeMacAddress(b) === currentNorm
    );

    if (isHardwareBlocked && userData.role !== 'admin') {
      // Record failed login attempt from blocked machine
      await updateDoc(userDocRef, {
        lastSeenHardwareId: currentHardwareId,
        lastActiveAt: Date.now()
      }).catch(() => {});

      return {
        success: false,
        error: `⛔ Hardware Blocked: This computer (MAC: ${currentHardwareId}) has been blacklisted by the Administrator. Access is forbidden on this machine.`,
        code: 'DEVICE_HARDWARE_BLOCKED',
        isDeviceBlocked: true,
        user: userData,
        currentHardwareId
      };
    }

    if (userData.role !== 'admin' && userData.isPcBindingEnabled) {
      if (userData.boundHardwareId) {
        const boundNorm = normalizeMacAddress(userData.boundHardwareId);
        const currentNorm = normalizeMacAddress(currentHardwareId);

        if (boundNorm !== currentNorm && userData.boundHardwareId.trim().toUpperCase() !== currentHardwareId.trim().toUpperCase()) {
          // Log attempt in database
          await updateDoc(userDocRef, {
            lastSeenHardwareId: currentHardwareId,
            lastActiveAt: Date.now()
          });

          return {
            success: false,
            error: `🔒 PC Hardware Lock: This user account is strictly bound to registered PC MAC (${userData.boundHardwareId}). Your current device MAC is (${currentHardwareId}). Please log in from the registered computer or ask Admin to rebind.`,
            code: 'PC_BINDING_MISMATCH',
            isPcBindingMismatch: true,
            user: userData,
            currentHardwareId: currentHardwareId,
            boundHardwareId: userData.boundHardwareId
          };
        }
      } else {
        // First login auto-binding: bind current PC to this user
        const now = Date.now();
        await updateDoc(userDocRef, {
          boundHardwareId: currentHardwareId,
          boundAt: now,
          boundHardwareLabel: `Bound on first login (${currentHardwareId})`
        });
        userData.boundHardwareId = currentHardwareId;
      }
    }

    // 5. Generate a NEW active session token (This automatically revokes/invalidates any previous login on other devices)
    const newSessionToken = generateSessionToken();
    const now = Date.now();

    // Get browser/device info
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceTag = isMobile ? 'Mobile Browser' : 'Desktop / Shop PC';

    await updateDoc(userDocRef, {
      activeSessionToken: newSessionToken,
      lastLoginAt: now,
      lastActiveAt: now,
      lastSeenHardwareId: currentHardwareId,
      lastLoginDevice: `${deviceTag} [MAC: ${currentHardwareId}] (${new Date().toLocaleTimeString()})`
    });

    const session: AuthSession = {
      userId: userData.userId,
      name: userData.name || userData.userId,
      role: userData.role || 'operator',
      sessionToken: newSessionToken,
      loginTime: now,
      subscriptionExpiresAt: userData.subscriptionExpiresAt || null,
    };

    // Store in localStorage
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    return { success: true, session, user: userData, currentHardwareId };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err.message || 'Authentication failed due to connection error.' };
  }
}

/**
 * Get current stored local session
 */
export function getLocalSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Clear local session on logout
 */
export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Logout and clear activeSessionToken on server if matching
 */
export async function logoutUser(session?: AuthSession | null): Promise<void> {
  try {
    const active = session || getLocalSession();
    if (active) {
      const userDocRef = doc(db, USERS_COLLECTION, normalizeUserId(active.userId));
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as AppUser;
        // Only clear if the session token is still ours
        if (data.activeSessionToken === active.sessionToken) {
          await updateDoc(userDocRef, {
            activeSessionToken: '',
            lastActiveAt: Date.now()
          });
        }
      }
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    clearLocalSession();
  }
}

/**
 * Real-time listener for the active user's session token.
 * If another device logs in with the same User ID, the server's `activeSessionToken`
 * will change to a new token, triggering `onSessionTerminated()` immediately!
 */
export function subscribeToUserSession(
  userId: string,
  mySessionToken: string,
  onSessionTerminated: (reason: string) => void,
  onUserStatusChange?: (user: AppUser) => void
): () => void {
  const normalizedId = normalizeUserId(userId);
  const userDocRef = doc(db, USERS_COLLECTION, normalizedId);

  const unsubscribe = onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) {
      onSessionTerminated('Your account was deleted by the Administrator.');
      return;
    }

    const userData = snap.data() as AppUser;

    // Check if account was disabled / disallowed in real-time
    if (!userData.isAllowed) {
      if (userData.subscriptionExpiresAt && userData.subscriptionExpiresAt > 0 && Date.now() > userData.subscriptionExpiresAt) {
        onSessionTerminated('⛔ Subscription Expired: Your 10-day trial or subscription has ended. An active subscription is required to continue.');
      } else {
        onSessionTerminated('Access revoked: Administrator has disabled your account permissions.');
      }
      return;
    }

    // Check subscription / trial expiration in real-time
    if (userData.role !== 'admin' && userData.subscriptionExpiresAt && userData.subscriptionExpiresAt > 0) {
      if (Date.now() > userData.subscriptionExpiresAt) {
        onSessionTerminated('⛔ Subscription Expired: Your 10-day free trial or subscription period has ended. An active subscription is required to continue using the application.');
        return;
      }
    }

    // Check single-session token conflict (Someone else logged in with this ID/password)
    if (userData.activeSessionToken && userData.activeSessionToken !== mySessionToken) {
      onSessionTerminated(
        'Concurrent Login Detected! This account was just logged in from another device or browser tab. Multiple simultaneous logins with the same User ID are not allowed.'
      );
      return;
    }

    if (onUserStatusChange) {
      onUserStatusChange(userData);
    }
  }, (err) => {
    console.warn('Session watcher error:', err);
  });

  return unsubscribe;
}

/**
 * Periodically send active ping / heartbeat to Firestore
 */
export async function sendHeartbeat(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, normalizeUserId(userId));
    await updateDoc(userDocRef, {
      lastActiveAt: Date.now()
    });
  } catch (err) {
    // Non-fatal
  }
}

// ================= ADMIN USER MANAGEMENT FUNCTIONS =================

/**
 * Subscribe to all users list in real-time (For Admin Panel)
 */
export function subscribeToAllUsers(callback: (users: AppUser[]) => void): () => void {
  const usersRef = collection(db, USERS_COLLECTION);
  return onSnapshot(usersRef, (snap) => {
    const users: AppUser[] = [];
    snap.forEach((docSnap) => {
      users.push(docSnap.data() as AppUser);
    });
    // Sort by admin first, then createdAt desc
    users.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    callback(users);
  }, (err) => {
    console.error('Subscribe users error:', err);
  });
}

/**
 * Calculate subscription expiry timestamp (ms) given number of days from now.
 * Pass 0 or negative for Lifetime / No Expiration.
 */
export function calculateExpiryTimestamp(days: number): number {
  if (days <= 0) return 0; // 0 = Lifetime
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

/**
 * Convert an expiry timestamp or days count into a human-readable subscription badge status
 */
export function getSubscriptionStatusDetails(user: AppUser): {
  status: 'pending' | 'active' | 'lifetime' | 'expired' | 'blocked' | 'trial';
  label: string;
  badgeClass: string;
  daysRemaining?: number;
  expiryFormatted?: string;
  isTrial?: boolean;
} {
  if (user.role === 'admin') {
    return {
      status: 'lifetime',
      label: '👑 Master Admin (Lifetime)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  if (user.isApproved === false) {
    return {
      status: 'pending',
      label: '⏳ Pending Approval',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
    };
  }

  if (!user.isAllowed) {
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > 0 && Date.now() > user.subscriptionExpiresAt) {
      const expiredDateStr = new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const isTrial = user.subscriptionType === 'trial';
      return {
        status: 'expired',
        label: isTrial ? `🔴 Free Trial Expired (${expiredDateStr})` : `🔴 Expired (${expiredDateStr})`,
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        daysRemaining: 0,
        expiryFormatted: expiredDateStr,
        isTrial
      };
    }
    return {
      status: 'blocked',
      label: '🚫 Access Suspended',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
  }

  if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt === 0 || user.subscriptionType === 'lifetime') {
    return {
      status: 'lifetime',
      label: '⭐ Lifetime Access',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      expiryFormatted: 'Never Expires'
    };
  }

  const now = Date.now();
  const diffMs = user.subscriptionExpiresAt - now;

  if (diffMs <= 0) {
    const expiredDateStr = new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const isTrial = user.subscriptionType === 'trial';
    return {
      status: 'expired',
      label: isTrial ? `🔴 10-Day Trial Expired (${expiredDateStr})` : `🔴 Expired (${expiredDateStr})`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      daysRemaining: 0,
      expiryFormatted: expiredDateStr,
      isTrial
    };
  }

  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const expiryDateStr = new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isTrial = user.subscriptionType === 'trial';

  if (isTrial) {
    return {
      status: 'trial',
      label: `🎁 10-Day Free Trial (${daysRemaining}d left)`,
      badgeClass: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-sm font-bold',
      daysRemaining,
      expiryFormatted: expiryDateStr,
      isTrial: true
    };
  }

  if (daysRemaining <= 3) {
    return {
      status: 'active',
      label: `⚠️ ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left`,
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      daysRemaining,
      expiryFormatted: expiryDateStr
    };
  }

  return {
    status: 'active',
    label: `🟢 ${daysRemaining} Days Active`,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    daysRemaining,
    expiryFormatted: expiryDateStr
  };
}

/**
 * Admin: Grant or reset a 10-day free trial for a user (or custom trial days)
 */
export async function grantTrialPeriod(
  userId: string,
  days: number = 10
): Promise<{ success: boolean; expiry?: number; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    const now = Date.now();
    const expiry = now + days * 24 * 60 * 60 * 1000;
    
    await updateDoc(docRef, {
      isAllowed: true,
      isApproved: true,
      subscriptionType: 'trial',
      subscriptionDays: days,
      subscriptionExpiresAt: expiry,
      subscriptionApprovedAt: now,
      notes: `10-Day Free Trial granted by Admin on ${new Date().toLocaleDateString()}`
    });
    return { success: true, expiry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to grant trial period.' };
  }
}

/**
 * Admin: Extend an existing subscription by additional days (+10, +30, +90 days, etc.)
 */
export async function extendUserSubscription(
  userId: string,
  additionalDays: number
): Promise<{ success: boolean; newExpiry?: number; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: false, error: 'User does not exist.' };
    
    const user = snap.data() as AppUser;
    const now = Date.now();
    const baseTime = (user.subscriptionExpiresAt && user.subscriptionExpiresAt > now)
      ? user.subscriptionExpiresAt
      : now;
    const newExpiry = baseTime + additionalDays * 24 * 60 * 60 * 1000;
    
    await updateDoc(docRef, {
      isAllowed: true,
      isApproved: true,
      subscriptionType: 'days',
      subscriptionDays: (user.subscriptionDays || 0) + additionalDays,
      subscriptionExpiresAt: newExpiry,
      subscriptionApprovedAt: now
    });
    return { success: true, newExpiry };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to extend subscription.' };
  }
}

/**
 * Admin: Expire a user's subscription immediately
 */
export async function expireUserSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await updateDoc(docRef, {
      isAllowed: false,
      subscriptionExpiresAt: Date.now() - 1000,
      activeSessionToken: ''
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to expire subscription.' };
  }
}

/**
 * Admin: Grant Lifetime Access (No expiry)
 */
export async function grantLifetimeAccess(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await updateDoc(docRef, {
      isAllowed: true,
      isApproved: true,
      subscriptionType: 'lifetime',
      subscriptionDays: 0,
      subscriptionExpiresAt: 0,
      subscriptionApprovedAt: Date.now()
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to grant lifetime access.' };
  }
}

/**
 * Quick 1-Click Approve User & Set Subscription Expiry Days (with optional PC Hardware binding)
 */
export async function approveUserWithSubscription(
  userId: string,
  days: number,
  role: 'admin' | 'operator' | 'user' = 'operator',
  options?: {
    isPcBindingEnabled?: boolean;
    boundHardwareId?: string;
    boundHardwareLabel?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    
    const expiryTimestamp = calculateExpiryTimestamp(days);

    const payload: Partial<AppUser> = {
      isAllowed: true,
      isApproved: true,
      role: role,
      subscriptionType: days <= 0 ? 'lifetime' : 'days',
      subscriptionDays: days,
      subscriptionExpiresAt: expiryTimestamp,
      subscriptionApprovedAt: Date.now()
    };

    if (options?.isPcBindingEnabled !== undefined) {
      payload.isPcBindingEnabled = options.isPcBindingEnabled;
    }
    if (options?.boundHardwareId) {
      payload.boundHardwareId = normalizeMacAddress(options.boundHardwareId);
      payload.boundAt = Date.now();
    }
    if (options?.boundHardwareLabel) {
      payload.boundHardwareLabel = options.boundHardwareLabel;
    }

    await updateDoc(docRef, payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve user.' };
  }
}

/**
 * Admin: Add or Create a new authorized user
 */
export async function createAuthorizedUser(user: {
  userId: string;
  name: string;
  password: string;
  role: 'admin' | 'operator' | 'user';
  isAllowed: boolean;
  subscriptionDays?: number; // 0 = Lifetime, or X days
  subscriptionExpiresAt?: number | null;
  subscriptionType?: 'lifetime' | 'days' | 'trial';
  isPcBindingEnabled?: boolean;
  boundHardwareId?: string;
  boundHardwareLabel?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(user.userId);
    if (!normalizedId || normalizedId.length < 2) {
      return { success: false, error: 'User ID must be at least 2 alphanumeric characters.' };
    }
    if (!user.password || user.password.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters long.' };
    }

    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      return { success: false, error: `User ID "${normalizedId}" already exists. Please choose another ID or edit existing.` };
    }

    const subDays = user.subscriptionDays !== undefined ? user.subscriptionDays : 0;
    const expiresAt = user.subscriptionExpiresAt !== undefined 
      ? user.subscriptionExpiresAt 
      : calculateExpiryTimestamp(subDays);

    const boundMac = user.boundHardwareId ? normalizeMacAddress(user.boundHardwareId) : '';

    const newUser: AppUser = {
      userId: normalizedId,
      name: user.name.trim() || normalizedId,
      password: user.password,
      role: user.role,
      isAllowed: user.isAllowed,
      isApproved: true,
      subscriptionType: subDays <= 0 && !expiresAt ? 'lifetime' : 'days',
      subscriptionDays: subDays,
      subscriptionExpiresAt: expiresAt,
      subscriptionApprovedAt: Date.now(),
      isPcBindingEnabled: user.isPcBindingEnabled || !!boundMac,
      boundHardwareId: boundMac,
      boundHardwareLabel: user.boundHardwareLabel || (boundMac ? `Registered PC (${boundMac})` : ''),
      boundAt: boundMac ? Date.now() : 0,
      notes: user.notes?.trim() || '',
      createdAt: Date.now(),
    };

    await setDoc(docRef, newUser);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create user.' };
  }
}

/**
 * Bind a user's account to a specified PC MAC Address or CPU ID
 * If no hardwareId is supplied, retrieves the current machine's detected MAC ID.
 */
export async function bindUserHardwareId(
  userId: string,
  hardwareId?: string,
  label?: string
): Promise<{ success: boolean; hardwareId: string; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const targetHardwareId = hardwareId ? normalizeMacAddress(hardwareId) : await getDetectedHardwareId();
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    
    await updateDoc(docRef, {
      boundHardwareId: targetHardwareId,
      isPcBindingEnabled: true,
      boundHardwareLabel: label || `Bound PC (${targetHardwareId})`,
      boundAt: Date.now(),
      lastSeenHardwareId: targetHardwareId
    });

    return { success: true, hardwareId: targetHardwareId };
  } catch (err: any) {
    console.error('Failed to bind hardware ID:', err);
    return { success: false, hardwareId: '', error: err.message || 'Failed to bind PC.' };
  }
}

/**
 * Unbind / Reset PC binding for a user (allowing them to log in from any machine or rebind on next login)
 */
export async function unbindUserHardwareId(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await updateDoc(docRef, {
      boundHardwareId: '',
      isPcBindingEnabled: false,
      boundHardwareLabel: '',
      boundAt: 0
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to unbind hardware ID:', err);
    return { success: false, error: err.message || 'Failed to unbind PC.' };
  }
}

/**
 * Toggle PC-binding enforcement on/off for a user
 */
export async function toggleUserPcBinding(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await updateDoc(docRef, {
      isPcBindingEnabled: enabled
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle PC binding.' };
  }
}

/**
 * Update complete hardware binding configuration for a user
 */
export async function updateUserHardwareBinding(
  userId: string,
  config: {
    isPcBindingEnabled: boolean;
    boundHardwareId?: string;
    boundHardwareLabel?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    
    const payload: any = {
      isPcBindingEnabled: config.isPcBindingEnabled
    };

    if (config.boundHardwareId !== undefined) {
      payload.boundHardwareId = normalizeMacAddress(config.boundHardwareId);
      payload.boundAt = Date.now();
    }
    if (config.boundHardwareLabel !== undefined) {
      payload.boundHardwareLabel = config.boundHardwareLabel.trim();
    }

    await updateDoc(docRef, payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update PC binding.' };
  }
}

/**
 * Helper to get current device hardware info
 */
export async function getCurrentDeviceHardwareInfo(): Promise<DeviceHardwareInfo> {
  return await getDeviceHardwareInfo();
}

/**
 * Clear or unbind device hardware lock from a registered user
 */
export async function clearUserHardwareBinding(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return unbindUserHardwareId(userId);
}

/**
 * Check if a hardware ID / MAC is in the blocked list
 */
export function isDeviceHardwareBlocked(
  hardwareId: string,
  blockedList?: string[]
): boolean {
  if (!hardwareId || !blockedList || blockedList.length === 0) return false;
  const target = normalizeMacAddress(hardwareId);
  return blockedList.some((b) => normalizeMacAddress(b) === target);
}

/**
 * Block a specific device ID (MAC or CPU HWID) globally from accessing any accounts
 */
export async function blockHardwareDevice(
  hardwareId: string,
  reason?: string,
  label?: string,
  adminUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanMac = normalizeMacAddress(hardwareId);
    if (!cleanMac) {
      return { success: false, error: 'Invalid Device MAC / Hardware ID provided.' };
    }

    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const currentData = existing.exists() ? (existing.data() as SystemSecurityConfig) : DEFAULT_SECURITY_CONFIG;

    const currentBlocked = (currentData.blockedHardwareIds || []).map(b => normalizeMacAddress(b));
    if (!currentBlocked.includes(cleanMac)) {
      currentBlocked.push(cleanMac);
    }

    const currentList = currentData.blockedDevicesList || [];
    const filteredList = currentList.filter(d => normalizeMacAddress(d.hardwareId) !== cleanMac);
    filteredList.unshift({
      hardwareId: cleanMac,
      blockedAt: Date.now(),
      reason: reason?.trim() || 'Blocked by Administrator',
      blockedBy: adminUserId || 'Admin',
      label: label?.trim() || `Device ${cleanMac}`
    });

    const payload: Partial<SystemSecurityConfig> = {
      blockedHardwareIds: currentBlocked,
      blockedDevicesList: filteredList,
      updatedBy: adminUserId || 'Admin',
      updatedAt: Date.now()
    };

    saveLocalSecurityConfig({ ...currentData, ...payload });
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to block hardware device:', err);
    return { success: false, error: err.message || 'Failed to block hardware device.' };
  }
}

/**
 * Unblock a specific device ID (MAC or CPU HWID), restoring access
 */
export async function unblockHardwareDevice(
  hardwareId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanMac = normalizeMacAddress(hardwareId);
    if (!cleanMac) {
      return { success: false, error: 'Invalid Device MAC / Hardware ID provided.' };
    }

    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const currentData = existing.exists() ? (existing.data() as SystemSecurityConfig) : DEFAULT_SECURITY_CONFIG;

    const currentBlocked = (currentData.blockedHardwareIds || [])
      .map(b => normalizeMacAddress(b))
      .filter(b => b !== cleanMac);

    const filteredList = (currentData.blockedDevicesList || []).filter(
      d => normalizeMacAddress(d.hardwareId) !== cleanMac
    );

    const payload: Partial<SystemSecurityConfig> = {
      blockedHardwareIds: currentBlocked,
      blockedDevicesList: filteredList,
      updatedAt: Date.now()
    };

    saveLocalSecurityConfig({ ...currentData, ...payload });
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to unblock hardware device:', err);
    return { success: false, error: err.message || 'Failed to unblock hardware device.' };
  }
}

/**
 * Admin: Update user details, password, role, subscription duration, or allow/disallow filter
 */
export async function updateAuthorizedUser(
  userId: string,
  updates: Partial<Omit<AppUser, 'userId' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    
    // If disabling or changing password, optionally terminate active session
    const payload: any = { ...updates };
    if (updates.isAllowed === false || updates.password) {
      payload.activeSessionToken = ''; // Force terminate their session
    }

    await updateDoc(docRef, payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user.' };
  }
}

/**
 * Admin: Force disconnect/terminate an active user's session
 */
export async function terminateUserSession(userId: string): Promise<boolean> {
  try {
    const normalizedId = normalizeUserId(userId);
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await updateDoc(docRef, {
      activeSessionToken: ''
    });
    return true;
  } catch (err) {
    console.error('Failed to terminate session:', err);
    return false;
  }
}

/**
 * Admin: Delete a user account permanently
 */
export async function deleteAuthorizedUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = normalizeUserId(userId);
    if (normalizedId === 'admin' || normalizedId === 'samit') {
      return { success: false, error: 'The Master Admin account cannot be deleted.' };
    }
    const docRef = doc(db, USERS_COLLECTION, normalizedId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete user:', err);
    return { success: false, error: err.message || 'Failed to delete user from database.' };
  }
}

/**
 * Admin / Developer: Update Telegram Link and Admin Contact Configuration
 */
export async function updateTelegramSecurityConfig(
  configUpdates: Partial<SystemSecurityConfig>,
  updatedBy: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const currentData = existing.exists() ? existing.data() : DEFAULT_SECURITY_CONFIG;

    const payload: SystemSecurityConfig = {
      ...DEFAULT_SECURITY_CONFIG,
      ...currentData,
      ...configUpdates,
      updatedBy: updatedBy,
      updatedAt: Date.now()
    };

    saveLocalSecurityConfig(payload);
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update telegram contact settings:', err);
    return { success: false, error: err.message || 'Failed to update contact configuration.' };
  }
}

/**
 * Fetch current system security & public access config
 */
export async function getSecurityConfig(): Promise<SystemSecurityConfig> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cfg = { ...DEFAULT_SECURITY_CONFIG, ...snap.data() } as SystemSecurityConfig;
      saveLocalSecurityConfig(cfg);
      return cfg;
    }
    // Seed default if not exists
    await setDoc(docRef, DEFAULT_SECURITY_CONFIG);
    saveLocalSecurityConfig(DEFAULT_SECURITY_CONFIG);
    return DEFAULT_SECURITY_CONFIG;
  } catch (err) {
    console.warn('Failed to load security config, using default:', err);
    return getLocalSecurityConfig();
  }
}

/**
 * Subscribe to real-time changes in system security & public access mode
 */
export function subscribeToSecurityConfig(
  callback: (config: SystemSecurityConfig) => void
): () => void {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const cfg = { ...DEFAULT_SECURITY_CONFIG, ...snap.data() } as SystemSecurityConfig;
        saveLocalSecurityConfig(cfg);
        callback(cfg);
      } else {
        setDoc(docRef, DEFAULT_SECURITY_CONFIG).catch(() => {});
        saveLocalSecurityConfig(DEFAULT_SECURITY_CONFIG);
        callback(DEFAULT_SECURITY_CONFIG);
      }
    }, (err) => {
      console.warn('Security config sync warning:', err);
      callback(getLocalSecurityConfig());
    });
  } catch (err) {
    console.error('Failed to subscribe to security config:', err);
    return () => {};
  }
}

/**
 * Admin: Enable or Disable Public Access (Without Login System)
 */
export async function setPublicAccessMode(
  enabled: boolean,
  updatedBy: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const currentData = existing.exists() ? existing.data() : DEFAULT_SECURITY_CONFIG;

    const payload: SystemSecurityConfig = {
      ...currentData,
      publicAccessEnabled: enabled,
      isLoginRequired: !enabled,
      updatedBy: updatedBy,
      updatedAt: Date.now()
    };

    saveLocalSecurityConfig(payload);
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to set public access mode:', err);
    return { success: false, error: err.message || 'Failed to update public access setting.' };
  }
}

