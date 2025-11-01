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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
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
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
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
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Start shopping
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Wish List</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ready to revisit these? Ask Trendella to rework ideas using your saved favorites.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/", { state: { reaskFromWishlist: true } })}
          className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
        >
          Re-ask model using Wish List
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((product) => (
          <ProductCard key={product.id} product={product} explanation="Saved from chat." />
        ))}
      </div>
    </div>
  );
};
