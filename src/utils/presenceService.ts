import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  increment,
  query,
  where,
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from './cloudPresetService';

export interface PresenceStats {
  onlineUsersCount: number;
  totalVisits: number;
  activeSessions: Array<{
    sessionId: string;
    userName: string;
    role: string;
    device: string;
    lastPing: number;
  }>;
  isLoading: boolean;
}

const PRESENCE_COLLECTION = 'online_presence';
const STATS_COLLECTION = 'system_stats';
const VISITS_DOC_ID = 'visits';
const HEARTBEAT_INTERVAL_MS = 25_000; // 25 seconds ping
const ONLINE_EXPIRY_MS = 60_000; // 60 seconds cutoff

// Generate or retrieve persistent browser session ID for presence
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('sayonika_presence_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    sessionStorage.setItem('sayonika_presence_session_id', sessionId);
  }
  return sessionId;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let device = 'Desktop PC';
  if (/android/i.test(ua)) device = 'Android Device';
  else if (/iPad|iPhone|iPod/.test(ua)) device = 'iOS Device';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux PC';
  return device;
}

class PresenceManager {
  private sessionId: string;
  private heartbeatTimer: number | null = null;
  private cleanupOldSessionsTimer: number | null = null;
  private unsubscribePresence: Unsubscribe | null = null;
  private unsubscribeStats: Unsubscribe | null = null;
  private listeners: Set<(stats: PresenceStats) => void> = new Set();
  
  private currentStats: PresenceStats = {
    onlineUsersCount: 1,
    totalVisits: 1,
    activeSessions: [],
    isLoading: true,
  };

  constructor() {
    this.sessionId = getOrCreateSessionId();
  }

  /**
   * Subscribe React components to live presence and visit stats
   */
  public subscribe(callback: (stats: PresenceStats) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentStats);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb({ ...this.currentStats });
      } catch (err) {
        console.error('Error notifying presence listener:', err);
      }
    });
  }

  /**
   * Start tracking user presence and record visit
   */
  public async initPresenceTracking(currentUser?: { userId: string; name: string; role: string } | null): Promise<void> {
    try {
      // 1. Record visit count (only once per browser tab session lifecycle)
      await this.recordVisitCount();

      // 2. Register current active presence document
      await this.sendHeartbeat(currentUser);

      // 3. Setup recurring heartbeat
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = window.setInterval(() => {
        this.sendHeartbeat(currentUser).catch(() => {});
      }, HEARTBEAT_INTERVAL_MS);

      // 4. Setup listeners for real-time online count & total visits
      this.listenToPresence();
      this.listenToVisits();

      // 5. Cleanup on tab close / unload
      const cleanupFn = () => {
        this.leavePresence();
      };
      window.addEventListener('beforeunload', cleanupFn);
      window.addEventListener('pagehide', cleanupFn);

    } catch (e) {
      console.warn('Presence tracking initialization note:', e);
      this.currentStats.isLoading = false;
      this.notify();
    }
  }

  /**
   * Increments total visits count in Firestore
   */
  private async recordVisitCount(): Promise<void> {
    const hasCountedSession = sessionStorage.getItem('sayonika_visit_counted');
    const statsDocRef = doc(db, STATS_COLLECTION, VISITS_DOC_ID);

    try {
      if (!hasCountedSession) {
        const snap = await getDoc(statsDocRef);
        if (!snap.exists()) {
          // Initialize visits counter document
          await setDoc(statsDocRef, {
            id: VISITS_DOC_ID,
            totalVisits: 1,
            updatedAt: Date.now(),
            lastVisitAt: Date.now()
          });
        } else {
          // Increment atomic visit count
          await updateDoc(statsDocRef, {
            totalVisits: increment(1),
            updatedAt: Date.now(),
            lastVisitAt: Date.now()
          });
        }
        sessionStorage.setItem('sayonika_visit_counted', 'true');
      }
    } catch (err) {
      console.warn('Visit record non-blocking warning:', err);
    }
  }

  /**
   * Send heartbeat to online_presence/{sessionId}
   */
  public async sendHeartbeat(currentUser?: { userId: string; name: string; role: string } | null): Promise<void> {
    try {
      const presenceDocRef = doc(db, PRESENCE_COLLECTION, this.sessionId);
      const now = Date.now();
      
      const payload = {
        sessionId: this.sessionId,
        userId: currentUser?.userId || 'guest',
        userName: currentUser?.name || 'Visitor',
        role: currentUser?.role || 'user',
        device: getDeviceInfo(),
        lastPing: now,
        joinedAt: now
      };

      await setDoc(presenceDocRef, payload, { merge: true });
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Clean up current session presence from Firestore
   */
  public async leavePresence(): Promise<void> {
    try {
      const presenceDocRef = doc(db, PRESENCE_COLLECTION, this.sessionId);
      await deleteDoc(presenceDocRef);
    } catch (e) {
      // Ignore unload cleanup errors
    }
  }

  /**
   * Listen to active users in online_presence collection
   */
  private listenToPresence(): void {
    if (this.unsubscribePresence) {
      this.unsubscribePresence();
    }

    const presenceCol = collection(db, PRESENCE_COLLECTION);

    this.unsubscribePresence = onSnapshot(
      presenceCol,
      (snapshot) => {
        const now = Date.now();
        const active: Array<{
          sessionId: string;
          userName: string;
          role: string;
          device: string;
          lastPing: number;
        }> = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const lastPing = Number(data.lastPing || 0);
          // If pinged within the active cutoff window
          if (now - lastPing <= ONLINE_EXPIRY_MS) {
            active.push({
              sessionId: docSnap.id,
              userName: data.userName || 'Visitor',
              role: data.role || 'user',
              device: data.device || 'PC',
              lastPing: lastPing
            });
          }
        });

        // Ensure at least 1 online user (the current client)
        const onlineCount = Math.max(1, active.length);
        this.currentStats.onlineUsersCount = onlineCount;
        this.currentStats.activeSessions = active;
        this.currentStats.isLoading = false;
        this.notify();
      },
      (error) => {
        console.warn('Presence listener notification:', error);
        this.currentStats.isLoading = false;
        this.notify();
      }
    );
  }

  /**
   * Listen to system_stats/visits document
   */
  private listenToVisits(): void {
    if (this.unsubscribeStats) {
      this.unsubscribeStats();
    }

    const statsDocRef = doc(db, STATS_COLLECTION, VISITS_DOC_ID);

    this.unsubscribeStats = onSnapshot(
      statsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const visits = Number(data.totalVisits) || 1;
          this.currentStats.totalVisits = visits;
          this.currentStats.isLoading = false;
          this.notify();
        } else {
          this.currentStats.totalVisits = 1;
          this.currentStats.isLoading = false;
          this.notify();
        }
      },
      (error) => {
        console.warn('Visits listener error:', error);
        this.currentStats.isLoading = false;
        this.notify();
      }
    );
  }

  public getStats(): PresenceStats {
    return { ...this.currentStats };
  }

  public destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupOldSessionsTimer) clearInterval(this.cleanupOldSessionsTimer);
    if (this.unsubscribePresence) this.unsubscribePresence();
    if (this.unsubscribeStats) this.unsubscribeStats();
    this.leavePresence().catch(() => {});
  }
}

export const presenceService = new PresenceManager();
