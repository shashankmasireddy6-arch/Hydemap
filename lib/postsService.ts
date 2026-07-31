import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
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
    photoUrls: data.photoUrls,
    status: data.status,
    // `email` is intentionally never read here — it's write-only, so it
    // never reaches other users through the app.
  };
}

/**
 * Fetches every active (non-expired, non-deleted) post from Firestore.
 * Called once on load. Posts whose expiresAt has passed are excluded by
 * the query itself; soft-deleted posts (status === "deleted", see
 * softDeletePost below) are filtered client-side rather than via a second
 * `where` clause — documents written before the `status` field existed
 * have no value for it at all, and a `where("status", "==", "active")`
 * query would silently exclude all of them. Filtering `!== "deleted"`
 * client-side treats "missing" the same as "active", matching how
 * `Property.status` is already documented as optional.
 */
export async function fetchPosts(): Promise<Property[]> {
  const activePosts = query(
    collection(db, POSTS_COLLECTION),
    where("expiresAt", ">", Timestamp.now())
  );
  const snapshot = await getDocs(activePosts);
  return snapshot.docs
    .map((docSnapshot) => toProperty(docSnapshot.id, docSnapshot.data()))
    .filter((property) => property.status !== "deleted");
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

/**
 * Soft-deletes a post: sets status to "deleted" via updateDoc rather than
 * removing the document (deleteDoc is never used — see the "Do NOT
 * permanently delete" requirement this implements). Firestore security
 * rules restrict this update to the admin account (see firestore.rules);
 * this function has no client-side admin check of its own, since a
 * client-side check can't actually enforce anything — the rules are the
 * real gate, this is just the call site the UI uses once the rules allow
 * it.
 */
export async function softDeletePost(postId: string): Promise<void> {
  await updateDoc(doc(db, POSTS_COLLECTION, postId), { status: "deleted" });
}

/**
 * Uploads post photos to Firebase Storage and returns their download URLs,
 * so they can ride along with the initial addPost() write. Grouped under a
 * random folder per call (rather than a Firestore doc id, which doesn't
 * exist yet at this point) purely to avoid filename collisions.
 */
export async function uploadPostPhotos(photos: File[]): Promise<string[]> {
  const folder = crypto.randomUUID();
  const uploads = photos.map(async (file, index) => {
    const fileRef = storageRef(storage, `posts/${folder}/${index}-${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  });
  return Promise.all(uploads);
}
