import {
  addDoc,
  collection,
  DocumentData,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Comment, NewComment } from "@/types/comment";

const COMMENTS_COLLECTION = "comments";

function toComment(id: string, data: DocumentData): Comment {
  return {
    id,
    postId: data.postId,
    commenterName: data.commenterName,
    commentText: data.commentText,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
  };
}

/**
 * Fetches every comment for a post, oldest first. Sorted client-side
 * rather than via Firestore `orderBy` — an equality (`postId`) filter
 * combined with an `orderBy` on a different field needs a composite
 * index, and per-post comment counts are small enough that sorting
 * ~dozens of already-fetched docs in JS is simpler than asking the user
 * to create one more Firestore index.
 */
export async function fetchComments(postId: string): Promise<Comment[]> {
  const commentsQuery = query(collection(db, COMMENTS_COLLECTION), where("postId", "==", postId));
  const snapshot = await getDocs(commentsQuery);
  return snapshot.docs
    .map((docSnapshot) => toComment(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Adds a comment — open to anyone, no login (see firestore.rules: comments
 * allow create: if true, same as posts). Does not notify the poster on its
 * own; see notifyPosterOfComment, called separately so a notification
 * failure never blocks the comment itself from saving.
 */
export async function addComment(data: NewComment): Promise<Comment> {
  const payload = { ...data, createdAt: Timestamp.fromMillis(data.createdAt) };
  const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), payload);
  return { id: docRef.id, ...data };
}

/**
 * Best-effort: asks the server (app/api/comments/notify) to email the
 * post's owner about a new comment. The owner's email is private (never
 * read by any client-side query — see postsService.ts#toProperty), so
 * this has to go through a server route with elevated (Admin SDK) access
 * rather than a direct Firestore read from here. Never throws — a failed
 * notification shouldn't surface as an error to the commenter, since
 * their comment already saved successfully regardless.
 */
export async function notifyPosterOfComment(
  postId: string,
  commenterName: string,
  commentText: string
): Promise<void> {
  try {
    const response = await fetch("/api/comments/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, commenterName, commentText }),
    });
    if (!response.ok) {
      console.error("Comment notification request failed:", response.status);
    }
  } catch (err) {
    console.error("Failed to reach comment notification endpoint:", err);
  }
}
