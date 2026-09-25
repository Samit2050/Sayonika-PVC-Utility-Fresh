import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export type NewsTickerEffect = 'smooth-marquee' | 'neon-pulse' | 'rgb-glow' | 'cyberpunk' | 'gold-fire' | 'subtle';
export type NewsTickerSpeed = 'slow' | 'medium' | 'fast';

export interface NewsTickerConfig {
  id: string;
  isEnabled: boolean;
  prefixLabel: string; // e.g. "📢 LATEST NEWS & UPDATES"
  text: string; // e.g. "Welcome to Sayonika PVC Utility! New High-Speed PDFium 600 DPI engine released..."
  linkUrl?: string; // Optional external link / website URL
  linkLabel?: string; // e.g. "Click to Visit Website" / "Read Details"
  effect: NewsTickerEffect;
  speed: NewsTickerSpeed;
  textColor?: string;
  badgeBgColor?: string;
  isPausedOnHover: boolean;
  showIcon: boolean;
  version: number;
  updatedBy?: string;
  updatedAt?: number;
}

export const NEWS_TICKER_DOC = 'news_ticker_config';
export const SYSTEM_CONFIG_COLLECTION = 'system_config';
const LOCAL_STORAGE_KEY = 'sayonika_news_ticker_config_v1';

export const DEFAULT_NEWS_TICKER_CONFIG: NewsTickerConfig = {
  id: NEWS_TICKER_DOC,
  isEnabled: true,
  prefixLabel: '📢 LATEST NEWS & UPDATES',
  text: '🚀 Welcome to Sayonika PVC Utility! Ultra HD 600 DPI Auto-Crop, Direct Print Imposition, & Instant WhatsApp/Admin Support active. For custom ID templates or licensing queries, click Message Admin.',
  linkUrl: 'https://wa.me/919153123869',
  linkLabel: '💬 WhatsApp Support',
  effect: 'neon-pulse',
  speed: 'medium',
  textColor: '#f8fafc',
  badgeBgColor: '#dc2626',
  isPausedOnHover: true,
  showIcon: true,
  version: 1,
  updatedBy: 'Admin',
  updatedAt: Date.now(),
};

/**
 * Retrieve cached local ticker config for instant zero-latency paint
 */
export function getLocalNewsTickerConfig(): NewsTickerConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_NEWS_TICKER_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to read local ticker config:', err);
  }
  return DEFAULT_NEWS_TICKER_CONFIG;
}

/**
 * Save to localStorage cache
 */
export function setLocalNewsTickerConfig(config: NewsTickerConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to cache news ticker config:', err);
  }
}

/**
 * Real-time listener from Firestore system_config/news_ticker_config
 */
export function subscribeToNewsTickerConfig(
  onUpdate: (config: NewsTickerConfig) => void
): () => void {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, NEWS_TICKER_DOC);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as Partial<NewsTickerConfig>;
          const merged: NewsTickerConfig = {
            ...DEFAULT_NEWS_TICKER_CONFIG,
            ...remote,
            id: NEWS_TICKER_DOC,
          };
          setLocalNewsTickerConfig(merged);
          onUpdate(merged);
        } else {
          // Initialize doc if not exists
          const initial = getLocalNewsTickerConfig();
          setDoc(docRef, initial).catch(() => {});
          onUpdate(initial);
        }
      },
      (error) => {
        console.warn('News ticker config sync error, using fallback:', error);
        onUpdate(getLocalNewsTickerConfig());
      }
    );
  } catch (err) {
    console.error('Failed to subscribe to news ticker config:', err);
    onUpdate(getLocalNewsTickerConfig());
    return () => {};
  }
}

/**
 * Save / Update news ticker configuration in Firestore (Admin only)
 */
export async function saveNewsTickerConfig(
  updatedConfig: Partial<NewsTickerConfig>,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, NEWS_TICKER_DOC);
    const existing = await getDoc(docRef);
    const prev = existing.exists() ? (existing.data() as NewsTickerConfig) : DEFAULT_NEWS_TICKER_CONFIG;

    const merged: NewsTickerConfig = {
      ...DEFAULT_NEWS_TICKER_CONFIG,
      ...prev,
      ...updatedConfig,
      id: NEWS_TICKER_DOC,
      version: (prev.version || 1) + 1,
      updatedBy: adminName || 'Admin',
      updatedAt: Date.now(),
    };

    setLocalNewsTickerConfig(merged);
    await setDoc(docRef, merged);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save news ticker config:', err);
    return { success: false, error: err.message || 'Failed to update news ticker.' };
  }
}
