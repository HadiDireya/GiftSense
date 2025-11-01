import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  type Auth
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;
let authInitializedPromise: Promise<void> | undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
};

const ensureApp = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(ensureApp());
    // Ensure the Firebase JS SDK persists the session across reloads so we can
    // recover the signed-in user before attempting wishlist fetches.
    void setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.error("Failed to set Firebase auth persistence", error);
    });
  }
  return authInstance;
};

export const waitForAuthReady = () => {
  if (!authInitializedPromise) {
    authInitializedPromise = new Promise<void>((resolve) => {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }
  return authInitializedPromise;
};

export const getFirestoreClient = () => {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(ensureApp());
  }
  return firestoreInstance;
};

export const getGoogleProvider = () => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }
  return googleProvider;
};
