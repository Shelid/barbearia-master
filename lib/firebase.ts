import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getLimitedUseToken,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  FirestoreError
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let appCheckInstance: AppCheck | null = null;

function getOrInitAppCheck() {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;

  if (typeof window === 'undefined' || !siteKey) {
    return null;
  }

  if (!appCheckInstance) {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheckInstance;
}

export async function getAppCheckTokenForBackend() {
  const appCheck = getOrInitAppCheck();
  if (!appCheck) {
    return null;
  }

  try {
    const limitedUse = await getLimitedUseToken(appCheck);
    return limitedUse.token;
  } catch (limitedUseError) {
    try {
      const fallback = await getToken(appCheck, false);
      return fallback.token;
    } catch (fallbackError) {
      console.warn('App Check token unavailable:', limitedUseError, fallbackError);
      return null;
    }
  }
}

// Error Handling Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Standardized error handler for Firestore operations
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // If it's a permission error, we throw the JSON string for the agent to diagnose
  if (error instanceof Error && error.message.includes('permission-denied')) {
    throw new Error(JSON.stringify(errInfo));
  }
  
  throw error;
}

/**
 * Connection test on boot
 */
async function testConnection() {
  try {
    // Attempt to get a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_internal_', 'connection-test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

if (typeof window !== 'undefined') {
  getOrInitAppCheck();
  testConnection();
}
