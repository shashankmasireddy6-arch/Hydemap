import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NewProperty, Property } from "@/types/post";

// Every post lives in this single top-level collection.
const POSTS_COLLECTION = "posts";

function toProperty(id: string, data: DocumentData): Property {
  return {
    id,
    type: data.type,
    title: data.title,
    price: data.price,
    latitude: data.latitude,
    longitude: data.longitude,
    genderPreference: data.genderPreference,
    anonymous: data.anonymous,
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : undefined,
    bhk: data.bhk,
    monthlyRent: data.monthlyRent,
    furnishing: data.furnishing,
    gatedSociety: data.gatedSociety,
    maintenanceIncluded: data.maintenanceIncluded,
    occupants: data.occupants,
    deposit: data.deposit,
    pets: data.pets,
    parking: data.parking,
    squareFootage: data.squareFootage,
    description: data.description,
    // `email` is intentionally never read here — it's write-only, so it
    // never reaches other users through the app.
  };
}

/**
 * Fetches every active (non-expired) post from Firestore. Called once on
 * load. Posts whose expiresAt has passed are excluded by the query itself
 * rather than filtered client-side.
 */
export async function fetchPosts(): Promise<Property[]> {
  const activePosts = query(
    collection(db, POSTS_COLLECTION),
    where("expiresAt", ">", Timestamp.now())
  );
  const snapshot = await getDocs(activePosts);
  return snapshot.docs.map((doc) => toProperty(doc.id, doc.data()));
}

/**
 * Adds a new post to Firestore and returns it with the id Firestore
 * assigned to the new document.
 */
export async function addPost(data: NewProperty): Promise<Property> {
  const { email, ...publicData } = data;

  // Firestore rejects `undefined` field values, so only send fields that
  // are actually set instead of writing them as undefined.
  const payload: DocumentData = {
    ...publicData,
    expiresAt: Timestamp.fromMillis(data.expiresAt),
  };
  if (email) payload.email = email;
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const docRef = await addDoc(collection(db, POSTS_COLLECTION), payload);
  return { id: docRef.id, ...publicData };
}
