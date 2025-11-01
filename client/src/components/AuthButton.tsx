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
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
      >
        {isPending ? "Connecting..." : "Continue with Google"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
      {user.picture && !imageErrored ? (
        <img
          src={user.picture}
          alt={user.name}
          className="h-6 w-6 rounded-full object-cover"
          onError={() => setImageErrored(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
          {userInitial || "?"}
        </div>
      )}
      <span className="text-slate-800 dark:text-slate-200">{user.name}</span>
      <button
        type="button"
        onClick={() => signOutMutation.mutate()}
        disabled={isPending}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-500 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:border-rose-400 dark:hover:text-rose-400"
      >
        Sign out
      </button>
    </div>
  );
};
