import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Server-only — never import this from a "use client" component. Needs
// FIREBASE_SERVICE_ACCOUNT_KEY (the full JSON key from Firebase Console >
// Project Settings > Service Accounts > Generate new private key, stored
// as a single-line env var) — deliberately not NEXT_PUBLIC_-prefixed, so
// it's never bundled to the browser. Used to read a post's private
// `email` field (never exposed to any client-side query — see
// postsService.ts#toProperty) when notifying its owner of a new comment.
let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY — see .env.local.example and the README's " +
        "\"Comment notifications\" setup section."
    );
  }

  adminApp = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  return adminApp;
}

// Lazily constructed (not at module import time) so a missing env var
// throws only when a route actually tries to use it, rather than crashing
// every route that happens to import this file.
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
