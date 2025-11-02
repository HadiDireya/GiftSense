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
            className="h-96 animate-pulse rounded-[28px] border border-white/40 bg-white/70 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10"
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
            className="rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow"
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
            className="rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow"
          >
            Start shopping
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between rounded-[32px] border border-white/40 bg-white/75 p-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Wish List
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ready to revisit these? Ask Trendella to rework ideas using your saved favorites.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/", { state: { reaskFromWishlist: true } })}
          className="rounded-full border border-brand/40 bg-brand/10 px-5 py-2 text-sm font-semibold text-brand shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:bg-brand/20 hover:text-brand-dark dark:border-brand/50 dark:bg-brand/20 dark:text-brand-light"
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
