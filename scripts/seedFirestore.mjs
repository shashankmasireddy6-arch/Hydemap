// One-time helper: uploads the sample listings in data/properties.json
// into your Firestore "posts" collection, so the map has something to
// show right after you connect a real Firebase project.
//
// Usage:
//   1. Fill in .env.local with your Firebase config (see .env.local.example).
//   2. Run:  npm run seed
//
// Safe to run more than once — it just adds more documents each time, so
// avoid re-running it if you don't want duplicate sample listings.

import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error(
    "Missing Firebase config. Copy .env.local.example to .env.local and fill in your project's values first."
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const raw = await readFile(new URL("../data/properties.json", import.meta.url), "utf8");
const properties = JSON.parse(raw);

// data/properties.json predates the expiration and flat-details fields, so
// fill in defaults here — without expiresAt, fetchPosts()'s "only active
// posts" query would exclude every seeded post immediately.
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

for (const { id, ...data } of properties) {
  // Firestore assigns its own document id — the JSON's `id` field was only
  // used for the local demo data, so it's dropped here.
  const docRef = await addDoc(collection(db, "posts"), {
    ...data,
    expiresAt: Timestamp.fromMillis(Date.now() + THIRTY_DAYS_MS),
    bhk: "2",
    monthlyRent: data.price,
    furnishing: "Furnished",
    gatedSociety: "Gated",
    parking: 1,
  });
  console.log(`Added "${data.title}" as ${docRef.id}`);
}

console.log(`Done — uploaded ${properties.length} posts to Firestore.`);
process.exit(0);
