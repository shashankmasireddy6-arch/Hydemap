import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore DB
export const db = getFirestore(app);

// Storage, for post photo uploads (see lib/postsService.ts).
export const storage = getStorage(app);

// Auth, for the admin sign-in gate on deleting posts (see lib/useAuth.ts).
// Needs "Google" enabled under Build > Authentication > Sign-in method in
// the Firebase console, plus the deployed domain added under
// Authentication > Settings > Authorized domains.
export const auth = getAuth(app);

// Helper flag
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;