import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Server-only — never import this from a "use client" component. Needs
// FIREBASE_SERVICE_ACCOUNT_KEY (the full JSON key from Firebase Console >
// Project Settings > Service Accounts > Generate new private key, stored
// as a single-line env var) — deliberately not NEXT_PUBLIC_-prefixed, so
// it's never bundled to the browser.
//
// Two reasons a route needs this instead of the plain client SDK
// (lib/firebase.ts's `db`):
// 1. Reading a post's private `email` field (never exposed to any
//    client-side query — see postsService.ts#toProperty) to notify its
//    owner of a new comment.
// 2. The client Firestore SDK's default transport doesn't work inside a
//    Next.js Route Handler at all — it failed at runtime with
//    "13 INTERNAL: message.copy is not a function" (a known
//    firebase-js-sdk/gRPC-in-serverless incompatibility) when first
//    tried for app/api/clusters. The Admin SDK is built for Node.js
//    server contexts from the ground up, so this is the correct fix, not
//    just a workaround — any future server-side Firestore *read* of
//    public data should also go through here rather than the client SDK,
//    even where it wouldn't otherwise need elevated permissions.
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
