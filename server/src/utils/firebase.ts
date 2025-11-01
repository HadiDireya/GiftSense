import { initializeApp, cert, getApps, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth as getAdminAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { env } from "./env";

let appInstance: App | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;

const getServiceAccount = (): ServiceAccount => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error("Firebase Admin credentials are not fully configured.");
  }
  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  };
};

export const getFirebaseAdminApp = (): App => {
  if (!appInstance) {
    const existing = getApps();
    appInstance =
      existing.length > 0
        ? existing[0]!
        : initializeApp({
            credential: cert(getServiceAccount())
          });
  }
  return appInstance;
};

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    authInstance = getAdminAuth(getFirebaseAdminApp());
  }
  return authInstance;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseAdminApp());
  }
  return firestoreInstance;
};

