"use client";

import { useAuth } from "@/lib/useAuth";

// Small top-left pill: "Admin sign in" when signed out, or the signed-in
// email + a sign-out button when signed in. Deliberately plain-text rather
// than adding a new icon — this is an internal/admin-only control, not
// part of the public-facing design language the rest of the app icons
// serve.
export default function AdminAuth() {
  const { user, isAdmin, isLoading, signIn, signOut } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signIn()}
        className="pointer-events-auto rounded-full border border-slate-100 bg-white/95 px-3.5 py-1.5 text-xs font-medium text-slate-500 shadow-panel backdrop-blur-md transition hover:bg-slate-50"
      >
        Admin sign in
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-100 bg-white/95 py-1.5 pl-3.5 pr-1.5 text-xs font-medium shadow-panel backdrop-blur-md">
      <span className={isAdmin ? "text-emerald-700" : "text-slate-500"}>
        {isAdmin ? "Admin" : user.email}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full px-2.5 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        Sign out
      </button>
    </div>
  );
}
