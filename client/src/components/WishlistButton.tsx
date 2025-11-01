import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { addWishlistItem, removeWishlistItem, type NormalizedProduct } from "../lib/api";

interface WishlistButtonProps {
  product: NormalizedProduct;
}

export const WishlistButton = ({ product }: WishlistButtonProps) => {
  const queryClient = useQueryClient();
  const cachedWishlistEntries =
    queryClient.getQueriesData<NormalizedProduct[]>({ queryKey: ["wishlist"] }) ?? [];
  const wishlist = cachedWishlistEntries.find(([, value]) => Array.isArray(value))?.[1] ?? [];
  const productKey = useMemo(
    () => `${product.store}|${product.id}`,
    [product.id, product.store]
  );
  const isSaved = wishlist.some((item) => `${item.store}|${item.id}` === productKey);

  const addMutation = useMutation({
    mutationFn: () => addWishlistItem(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: () => removeWishlistItem(product.id, product.store),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  });

  const handleToggle = () => {
    if (isSaved) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all duration-200 shadow-soft ${
        isSaved
          ? "border-rose-500/60 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 hover:scale-105 hover:border-rose-500 hover:shadow-glow dark:border-rose-400/60 dark:from-rose-500/20 dark:to-rose-500/10 dark:text-rose-300"
          : "border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-700 hover:border-brand hover:bg-gradient-to-br hover:from-brand/10 hover:to-brand/5 hover:text-brand hover:scale-105 hover:shadow-glow dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:from-brand/20 dark:hover:to-brand/10"
      } disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100`}
      aria-pressed={isSaved}
    >
      {isSaved ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )}
    </button>
  );
};
