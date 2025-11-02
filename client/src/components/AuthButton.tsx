import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { fetchMe, postFirebaseSession, revokeSession } from "../lib/api";
import { getFirebaseAuth, getGoogleProvider } from "../lib/firebase";

export const AuthButton = () => {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const [imageErrored, setImageErrored] = useState(false);

  const invalidateProfile = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
    ]);
  };

  const signInMutation = useMutation({
    mutationFn: async () => {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      const idToken = await firebaseUser.getIdToken();
      await postFirebaseSession(idToken);
    },
    onSuccess: invalidateProfile
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const auth = getFirebaseAuth();
      await auth.signOut();
      await revokeSession();
    },
    onSettled: invalidateProfile
  });

  const isPending = signInMutation.isPending || signOutMutation.isPending || isLoading;

  const userInitial = useMemo(() => (user?.name?.[0] ?? "").toUpperCase(), [user?.name]);

  useEffect(() => {
    setImageErrored(false);
  }, [user?.id]);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInMutation.mutate()}
        disabled={isPending}
        className="inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur-glass transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {isPending ? "Connecting..." : "Continue with Google"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/40 bg-white/75 px-4 py-2 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10">
      {user.picture && !imageErrored ? (
        <img
          src={user.picture}
          alt={user.name}
          className="h-9 w-9 rounded-2xl object-cover border border-white/60 shadow-soft"
          onError={() => setImageErrored(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-mint text-xs font-semibold text-white shadow-soft">
          {userInitial || "?"}
        </div>
      )}
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
      <button
        type="button"
        onClick={() => signOutMutation.mutate()}
        disabled={isPending}
        className="rounded-full border border-white/40 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-500 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:text-rose-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
      >
        Sign out
      </button>
    </div>
  );
};
