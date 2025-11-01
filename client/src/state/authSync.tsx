import { useEffect, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { queryClient } from "../lib/queryClient";
import { getFirebaseAuth } from "../lib/firebase";

interface AuthSyncProps {
  children: ReactNode;
}

/**
 * Keeps React Query in sync with Firebase auth state so that, after a refresh,
 * we re-fetch /api/me and /api/wishlist with the restored credentials.
 */
export const AuthSync = ({ children }: AuthSyncProps) => {
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      ]);
    });
    return () => unsubscribe();
  }, []);

  return <>{children}</>;
};
