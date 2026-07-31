// A single comment on a post. Anonymous — commenterName is free text, not
// tied to any account (this app has no user accounts for regular
// visitors, only the one hardcoded admin — see lib/useAuth.ts).
export interface Comment {
  id: string;
  postId: string;
  commenterName: string;
  commentText: string;
  createdAt: number; // epoch ms
}

export type NewComment = Omit<Comment, "id">;
