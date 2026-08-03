import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

const POSTS_COLLECTION = "posts";

/**
 * Server-only counterpart to postsService.ts#fetchPosts, for routes that
 * can't use the client SDK — see the comment in lib/firebaseAdmin.ts for
 * why. Lightweight on purpose: pulls only id/lat/lng/rent rather than
 * every field, since that's all grid-bucket clustering (app/api/clusters)
 * needs — `rent` (from the post's `price` field; `price` and
 * `monthlyRent` are always written equal, see createPostForm.ts) backs
 * the mid-zoom price-range tier's min/max aggregation. Same active-post
 * filtering as fetchPosts(): expiresAt in the future, status not
 * "deleted" (checked client-side-in-the-route rather than via a second
 * `where`, since documents written before `status` existed have no value
 * for it at all — see fetchPosts()'s doc comment for the full reasoning).
 */
export async function fetchActiveListingPointsAdmin(): Promise<
  { id: string; lat: number; lng: number; rent: number }[]
> {
  const snapshot = await getAdminDb()
    .collection(POSTS_COLLECTION)
    .where("expiresAt", ">", Timestamp.now())
    .get();

  return snapshot.docs
    .filter((doc) => doc.data().status !== "deleted")
    .map((doc) => ({
      id: doc.id,
      lat: doc.data().latitude,
      lng: doc.data().longitude,
      rent: doc.data().price ?? 0,
    }));
}
