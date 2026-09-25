import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App instance safely
export const firebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Initialize Firestore with client-side multi-tab caching
let dbInstance: ReturnType<typeof getFirestore>;
try {
  dbInstance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
  }, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  // Fallback to getFirestore if already initialized or standard cache
  dbInstance = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');
}

export const db = dbInstance;
export const auth = getAuth(firebaseApp);
