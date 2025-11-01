import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ProductCard } from "../components/ProductCard";
import { fetchMe, fetchWishlist, type NormalizedProduct } from "../lib/api";

export const WishlistPage = () => {
  const navigate = useNavigate();

  // Wait for the auth session to hydrate before hitting the wishlist endpoint;
  // otherwise we might race the backend and get the guest list (empty) back.
  const { data: user, isPending: isUserPending } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe
  });

  const {
    data = [],
    isLoading,
    isError
  } = useQuery<NormalizedProduct[]>({
    queryKey: ["wishlist", user?.id ?? "guest"],
    queryFn: fetchWishlist,
    placeholderData: [],
    enabled: Boolean(user)
  });

  console.log("wishlist query state", {
    user,
    isUserPending,
    isLoading,
    isError,
    dataLength: data?.length
  });

  if (isLoading || isUserPending) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="h-96 animate-pulse rounded-2xl border-2 border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Wish list unavailable"
        description="I couldn't load your saved picks. Try refreshing or returning to the chat."
        action={
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl bg-gradient-to-br from-brand to-brand-dark px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow"
          >
            Back to chat
          </button>
        }
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No saved gifts yet"
        description='Tap "Save to Wish List" on any gift card in the chat to keep it here.'
        action={
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl bg-gradient-to-br from-brand to-brand-dark px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow"
          >
            Start shopping
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200/60 bg-white/90 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/90 p-6 shadow-soft-lg">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent mb-2">
            Wish List
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Ready to revisit these? Ask Trendella to rework ideas using your saved favorites.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/", { state: { reaskFromWishlist: true } })}
          className="rounded-xl border-2 border-brand/60 bg-gradient-to-br from-brand/10 to-brand/5 px-5 py-2.5 text-sm font-bold text-brand shadow-soft transition-all duration-200 hover:scale-105 hover:border-brand hover:from-brand hover:to-brand-dark hover:text-white hover:shadow-glow dark:border-brand/60 dark:from-brand/20 dark:to-brand/10 dark:text-brand-light"
        >
          Re-ask with Wish List
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((product) => (
          <ProductCard key={product.id} product={product} explanation="Saved from chat." />
        ))}
      </div>
    </div>
  );
};
