import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';
import QRCode from 'qrcode';
import { db } from '../firebase';
import { AppUser, calculateExpiryTimestamp, normalizeUserId } from './authService';

export interface SubscriptionPlan {
  id: string;
  name: string;
  days: number; // 0 = Lifetime
  priceInr: number;
  originalPriceInr?: number;
  tag?: string; // e.g. "Most Popular", "Best Value", "Starter"
  description: string;
  features: string[];
  isEnabled: boolean;
}

export interface UpiPricingConfig {
  upiId: string;
  payeeName: string;
  qrNote: string;
  customQrImageUrl?: string;
  instructions: string;
  adminWhatsApp?: string;
  adminTelegram?: string;
  plans: SubscriptionPlan[];
  updatedBy?: string;
  updatedAt?: number;
}

export type PaymentAppType = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | 'other';

export interface SubscriptionPaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile?: string;
  planId: string;
  planName: string;
  planDays: number;
  amountPaid: number;
  utrNumber: string;
  paymentApp: PaymentAppType;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  grantedDays?: number;
  grantedExpiresAt?: number;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_30_days',
    name: '1 Month Pro',
    days: 30,
    priceInr: 99,
    originalPriceInr: 199,
    tag: 'Monthly',
    description: 'Ideal for monthly operators & small Xerox shops',
    features: [
      '30 Days Unlimited PVC Auto-Crop',
      'Epson L8050/L18050 Tray 600 DPI Output',
      'Batch PDF Processing with Password Unlock',
      'All Aadhaar, Voter, PAN, Ayushman Presets'
    ],
    isEnabled: true,
  },
  {
    id: 'plan_90_days',
    name: '3 Months Booster',
    days: 90,
    priceInr: 249,
    originalPriceInr: 499,
    tag: 'Most Popular',
    description: 'Best balance of cost and continuous shop operations',
    features: [
      '90 Days Unlimited Batch Card Processing',
      'Cloud Templates Sync & Preset Manager',
      'Epson Photo+ 2-Pass Borderless Helper',
      'Priority Admin Support via Telegram'
    ],
    isEnabled: true,
  },
  {
    id: 'plan_180_days',
    name: '6 Months Half-Yearly',
    days: 180,
    priceInr: 449,
    originalPriceInr: 899,
    tag: 'Save 50%',
    description: 'Half-year continuous access with all future updates',
    features: [
      '180 Days Full Unrestricted Studio Access',
      'Custom Multi-Page PDF Crop & Templates',
      'Ultra HD 600 DPI Photo Quality Export',
      'Fast Instant Approval Guarantee'
    ],
    isEnabled: true,
  },
  {
    id: 'plan_365_days',
    name: '1 Year Annual Pass',
    days: 365,
    priceInr: 799,
    originalPriceInr: 1599,
    tag: 'Best Value',
    description: 'Full year uninterrupted card processing for busy printing centres',
    features: [
      '365 Days Full Pro Unlocked Access',
      'All Future Preset & Firmware Updates',
      'High-Speed PDFium Dual Rendering Engine',
      'Direct WhatsApp / Telegram Developer Support'
    ],
    isEnabled: true,
  },
  {
    id: 'plan_lifetime',
    name: 'Lifetime VIP Access',
    days: 0,
    priceInr: 1499,
    originalPriceInr: 2999,
    tag: 'VIP Forever',
    description: 'Pay once and own the utility forever without renewals',
    features: [
      'Lifetime No-Expiry Access for your Shop',
      'Permanent Pro Badge & Unlimited Usage',
      'All Future Presets & Cloud Templates Included',
      'Highest Priority Support & Direct Dev Connect'
    ],
    isEnabled: true,
  }
];

export const DEFAULT_UPI_PRICING_CONFIG: UpiPricingConfig = {
  upiId: 'biswasxerox40@okaxis',
  payeeName: 'Biswas Xerox Centre',
  qrNote: 'Sayonika PVC Pro Subscription',
  customQrImageUrl: '',
  instructions: '1. Scan the UPI QR Code with Google Pay, PhonePe, Paytm, or BHIM.\n2. Pay the exact plan amount.\n3. Note down the 12-digit UTR / Reference No.\n4. Enter the UTR below and click Submit Request for instant approval!',
  adminWhatsApp: '+919876543210',
  adminTelegram: 'https://t.me/BiswasXerox',
  plans: DEFAULT_SUBSCRIPTION_PLANS,
  updatedBy: 'Admin',
  updatedAt: Date.now(),
};

const PRICING_CONFIG_DOC = 'subscription_pricing';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const REQUESTS_COLLECTION = 'subscription_requests';
const USERS_COLLECTION = 'users';

const PRICING_CACHE_KEY = 'sayonika_upi_pricing_cache_v1';

export function getLocalPricingConfig(): UpiPricingConfig {
  try {
    const raw = localStorage.getItem(PRICING_CACHE_KEY);
    if (!raw) return DEFAULT_UPI_PRICING_CONFIG;
    const parsed = JSON.parse(raw);
    return { 
      ...DEFAULT_UPI_PRICING_CONFIG, 
      ...parsed,
      plans: Array.isArray(parsed?.plans) && parsed.plans.length > 0 ? parsed.plans : DEFAULT_SUBSCRIPTION_PLANS
    };
  } catch {
    return DEFAULT_UPI_PRICING_CONFIG;
  }
}

export function saveLocalPricingConfig(cfg: UpiPricingConfig): void {
  try {
    localStorage.setItem(PRICING_CACHE_KEY, JSON.stringify(cfg));
  } catch {}
}

/**
 * Generate standard UPI Intent / Deep Link URL
 */
export function generateUpiUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}): string {
  const pa = encodeURIComponent(params.upiId.trim());
  const pn = encodeURIComponent(params.payeeName.trim());
  const am = params.amount.toFixed(2);
  const tn = encodeURIComponent(params.transactionNote.trim());
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

/**
 * Generate high-resolution QR code data URL using qrcode library
 */
export async function generateUpiQrCodeDataUrl(upiUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 380,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

/**
 * Subscribe to real-time UPI Pricing & Plan Config from Firestore
 */
export function subscribeToPricingConfig(callback: (config: UpiPricingConfig) => void): () => void {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, PRICING_CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UpiPricingConfig;
        const config: UpiPricingConfig = {
          ...DEFAULT_UPI_PRICING_CONFIG,
          ...data,
          plans: Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_SUBSCRIPTION_PLANS
        };
        saveLocalPricingConfig(config);
        callback(config);
      } else {
        // Seed default config in Firestore if not yet created
        setDoc(docRef, DEFAULT_UPI_PRICING_CONFIG).catch(() => {});
        saveLocalPricingConfig(DEFAULT_UPI_PRICING_CONFIG);
        callback(DEFAULT_UPI_PRICING_CONFIG);
      }
    }, (err) => {
      console.warn('Subscription pricing config listener warning:', err);
      callback(getLocalPricingConfig());
    });
  } catch (err) {
    console.error('Failed to subscribe to pricing config:', err);
    return () => {};
  }
}

/**
 * Admin: Update UPI ID, Payee details, instructions, or subscription plans
 */
export async function updateSubscriptionPricingConfig(
  updates: Partial<UpiPricingConfig>,
  updatedBy: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, PRICING_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const currentData = existing.exists() ? existing.data() : DEFAULT_UPI_PRICING_CONFIG;

    const payload: UpiPricingConfig = {
      ...DEFAULT_UPI_PRICING_CONFIG,
      ...currentData,
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    };

    saveLocalPricingConfig(payload);
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update subscription pricing:', err);
    return { success: false, error: err.message || 'Failed to save pricing configuration.' };
  }
}

/**
 * User / Operator: Submit a new Subscription Payment Request with UTR Number
 */
export async function submitSubscriptionPaymentRequest(data: {
  userId: string;
  userName: string;
  userMobile?: string;
  planId: string;
  planName: string;
  planDays: number;
  amountPaid: number;
  utrNumber: string;
  paymentApp: PaymentAppType;
  notes?: string;
}): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const cleanUserId = normalizeUserId(data.userId);
    if (!cleanUserId) {
      return { success: false, error: 'Please specify a valid User ID or Mobile Number.' };
    }

    const cleanUtr = data.utrNumber.trim().replace(/\s+/g, '');
    if (!cleanUtr || cleanUtr.length < 6) {
      return { success: false, error: 'Please enter a valid UPI UTR / Reference Number (at least 6 digits).' };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, REQUESTS_COLLECTION, requestId);

    const requestObj: SubscriptionPaymentRequest = {
      id: requestId,
      userId: cleanUserId,
      userName: data.userName.trim() || cleanUserId,
      userMobile: data.userMobile ? data.userMobile.trim() : (cleanUserId.match(/^\d{10}$/) ? cleanUserId : ''),
      planId: data.planId,
      planName: data.planName,
      planDays: Number(data.planDays),
      amountPaid: Number(data.amountPaid),
      utrNumber: cleanUtr,
      paymentApp: data.paymentApp || 'other',
      notes: data.notes?.trim() || '',
      status: 'pending',
      createdAt: Date.now(),
    };

    await setDoc(docRef, requestObj);
    return { success: true, requestId };
  } catch (err: any) {
    console.error('Failed to submit subscription request:', err);
    return { success: false, error: err.message || 'Payment request submission failed due to connection error.' };
  }
}

/**
 * User: Subscribe to real-time payment requests for a specific User ID
 */
export function subscribeToUserPaymentRequests(
  userId: string,
  callback: (requests: SubscriptionPaymentRequest[]) => void
): () => void {
  try {
    const cleanUserId = normalizeUserId(userId);
    const colRef = collection(db, REQUESTS_COLLECTION);
    
    // Listen to collection and filter on client to avoid composite index requirements
    return onSnapshot(colRef, (snap) => {
      const list: SubscriptionPaymentRequest[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as SubscriptionPaymentRequest;
        if (item.userId === cleanUserId) {
          list.push(item);
        }
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    }, (err) => {
      console.warn('User subscription requests sync error:', err);
    });
  } catch (err) {
    console.error('Failed to listen to user payment requests:', err);
    return () => {};
  }
}

/**
 * Admin: Subscribe to all payment requests in real-time
 */
export function subscribeToAllPaymentRequests(
  callback: (requests: SubscriptionPaymentRequest[]) => void
): () => void {
  try {
    const colRef = collection(db, REQUESTS_COLLECTION);
    return onSnapshot(colRef, (snap) => {
      const list: SubscriptionPaymentRequest[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as SubscriptionPaymentRequest);
      });
      // Sort: Pending first, then newest first
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      callback(list);
    }, (err) => {
      console.error('All payment requests sync error:', err);
    });
  } catch (err) {
    console.error('Failed to subscribe to payment requests:', err);
    return () => {};
  }
}

/**
 * Admin: Approve a payment request, apply subscription days to user, and activate their account
 */
export async function approvePaymentRequest(
  request: SubscriptionPaymentRequest,
  customDays?: number,
  reviewedBy: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const daysToGrant = customDays !== undefined ? customDays : request.planDays;
    const reqDocRef = doc(db, REQUESTS_COLLECTION, request.id);
    const userDocRef = doc(db, USERS_COLLECTION, normalizeUserId(request.userId));

    const userSnap = await getDoc(userDocRef);
    const existingUserData = userSnap.exists() ? (userSnap.data() as AppUser) : null;

    let newExpiryTimestamp: number = 0;

    if (daysToGrant <= 0) {
      // Lifetime Access
      newExpiryTimestamp = 0;
    } else {
      // Check if user currently has active unexpired days, stack on top or start from now
      const now = Date.now();
      const currentExpiry = existingUserData?.subscriptionExpiresAt || 0;
      const baseTime = currentExpiry > now ? currentExpiry : now;
      newExpiryTimestamp = baseTime + daysToGrant * 24 * 60 * 60 * 1000;
    }

    // 1. Update User Record
    const userUpdates: Partial<AppUser> = {
      isAllowed: true,
      isApproved: true,
      subscriptionType: daysToGrant <= 0 ? 'lifetime' : 'days',
      subscriptionDays: daysToGrant,
      subscriptionExpiresAt: newExpiryTimestamp,
      subscriptionApprovedAt: Date.now(),
    };

    if (existingUserData) {
      await updateDoc(userDocRef, userUpdates);
    } else {
      // Create user if not existing
      const newUser: AppUser = {
        userId: request.userId,
        name: request.userName || request.userId,
        mobileNumber: request.userMobile || (request.userId.match(/^\d{10}$/) ? request.userId : ''),
        password: 'User@123', // Default temporary password
        role: 'operator',
        isAllowed: true,
        isApproved: true,
        subscriptionType: daysToGrant <= 0 ? 'lifetime' : 'days',
        subscriptionDays: daysToGrant,
        subscriptionExpiresAt: newExpiryTimestamp,
        subscriptionApprovedAt: Date.now(),
        notes: `Activated via UPI UTR: ${request.utrNumber} on ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
      };
      await setDoc(userDocRef, newUser);
    }

    // 2. Update Request Status to 'approved'
    await updateDoc(reqDocRef, {
      status: 'approved',
      reviewedAt: Date.now(),
      reviewedBy: reviewedBy,
      grantedDays: daysToGrant,
      grantedExpiresAt: newExpiryTimestamp,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to approve payment request:', err);
    return { success: false, error: err.message || 'Failed to approve payment request.' };
  }
}

/**
 * Admin: Reject a payment request with a reason (e.g. Invalid UTR, Payment Not Received)
 */
export async function rejectPaymentRequest(
  requestId: string,
  reason: string,
  reviewedBy: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqDocRef = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(reqDocRef, {
      status: 'rejected',
      rejectionReason: reason.trim() || 'Payment not credited or invalid transaction UTR.',
      reviewedAt: Date.now(),
      reviewedBy: reviewedBy,
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to reject payment request:', err);
    return { success: false, error: err.message || 'Failed to reject payment request.' };
  }
}

/**
 * Admin: Delete a payment request record from history
 */
export async function deletePaymentRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const reqDocRef = doc(db, REQUESTS_COLLECTION, requestId);
    await deleteDoc(reqDocRef);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete payment request:', err);
    return { success: false, error: err.message || 'Failed to delete request record.' };
  }
}
