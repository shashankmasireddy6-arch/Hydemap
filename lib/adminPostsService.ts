import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { PostType } from "@/types/post";

const POSTS_COLLECTION = "posts";

/**
 * Server-only counterpart to postsService.ts#fetchPosts, for routes that
 * can't use the client SDK — see the comment in lib/firebaseAdmin.ts for
 * why. Lightweight on purpose: pulls only id/lat/lng/rent/type rather than
 * every field, since that's all grid-bucket clustering (app/api/clusters)
 * needs — `rent` (from the post's `price` field; `price` and
 * `monthlyRent` are always written equal, see createPostForm.ts) backs
 * the mid-zoom price-range tier's min/max aggregation, and `type` lets
 * that same tier avoid grouping a recurring monthly rent with a one-time
 * Sale price into one misleading range (see clusterGrid.ts). Same
 * active-post filtering as fetchPosts(): expiresAt in the future, status
 * not "deleted" (checked client-side-in-the-route rather than via a
 * second `where`, since documents written before `status` existed have
 * no value for it at all — see fetchPosts()'s doc comment for the full
 * reasoning).
 */
export async function fetchActiveListingPointsAdmin(): Promise<
  { id: string; lat: number; lng: number; rent: number; type: PostType }[]
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
      type: doc.data().type,
    }));
}
