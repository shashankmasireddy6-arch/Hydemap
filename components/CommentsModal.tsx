"use client";

import { useEffect, useState } from "react";
import { addComment, fetchComments, notifyPosterOfComment } from "@/lib/commentsService";
import { Comment } from "@/types/comment";
import { CloseIcon } from "@/components/icons";

interface CommentsModalProps {
  // The post being commented on, or null when the modal should be closed.
  // Keeping this as an id (rather than isOpen: boolean) means the effect
  // below can key its fetch directly off of it.
  postId: string | null;
  onClose: () => void;
}

// Matches CreatePostModal's animation pattern for consistency.
const TRANSITION_MS = 200;

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const formatTimestamp = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function CommentsModal({ postId, onClose }: CommentsModalProps) {
  const isOpen = postId !== null;
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // (Re)load comments whenever a different post is opened, and reset the
  // form so it doesn't carry over into a comment on a different listing.
  useEffect(() => {
    if (!postId) return;

    setComments([]);
    setName("");
    setText("");
    setError(undefined);
    setIsLoading(true);

    let cancelled = false;
    fetchComments(postId)
      .then((fetched) => {
        if (!cancelled) setComments(fetched);
      })
      .catch((err) => {
        console.error("Failed to fetch comments:", err);
        if (!cancelled) setError("Couldn't load comments.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!shouldRender) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId) return;

    const commenterName = name.trim();
    const commentText = text.trim();
    if (!commenterName || !commentText) {
      setError("Enter your name and a comment.");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      const createdAt = Date.now();
      const newComment = await addComment({ postId, commenterName, commentText, createdAt });
      setComments((prev) => [...prev, newComment]);
      setName("");
      setText("");
      // Best-effort, not awaited — a failed notification shouldn't hold up
      // the "comment posted" state, since the comment itself is already
      // saved regardless of whether the email goes out.
      notifyPosterOfComment(postId, commenterName, commentText);
    } catch (err) {
      console.error("Failed to post comment:", err);
      setError("Couldn't post your comment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-panel transition-all duration-200 ease-out ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet — be the first.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {comment.commenterName}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {comment.commentText}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4"
        >
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={isSubmitting}
            className={inputClasses}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            disabled={isSubmitting}
            className={`${inputClasses} resize-none`}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Posting…" : "Post comment"}
          </button>
        </form>
      </div>
    </div>
  );
}
