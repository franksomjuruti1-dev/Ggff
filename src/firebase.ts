import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  terminate,
  clearIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the specific firestoreDatabaseId from the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Error Handling Spec for Firestore Permissions
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
  code?: string;
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errCode = (error as any)?.code;
  let errorMessage = "Unknown error";
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    try {
      errorMessage = String(error);
    } catch (e) {
      errorMessage = "Non-stringifiable error object";
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    code: errCode,
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
  }
  
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  
  if (shouldThrow) {
    throw new Error(errorJson);
  }
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDoc(doc(db, 'settings', 'global'));
    console.log("Firebase Connection: Success");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('permission-denied'))) {
      console.error("Firebase Connection Error:", error.message);
    }
  }
}
testConnection();
