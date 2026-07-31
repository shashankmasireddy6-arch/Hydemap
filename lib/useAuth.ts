import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Single hardcoded admin, per the "one admin, hardcoded email" requirement.
// Must match the email in firestore.rules exactly — rules are a separate
// static file and can't import this constant, so keep the two in sync by
// hand if this ever changes.
export const ADMIN_EMAIL = "operations@vectorsol.in";

/**
 * Tracks the signed-in Firebase user and whether they're the admin.
 * signIn()/signOut() are Google Sign-In — the only reason auth exists in
 * this app at all is to give the Firestore security rules something real
 * to check (request.auth.token.email) before allowing a post update; a
 * client-side-only "is this the admin email" check can't be enforced, see
 * the Delete button's gating in MapView.tsx for what that means in
 * practice.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const signIn = () => signInWithPopup(auth, new GoogleAuthProvider());
  const signOut = () => firebaseSignOut(auth);

  return {
    user,
    isAdmin: user?.email === ADMIN_EMAIL,
    isLoading,
    signIn,
    signOut,
  };
}
