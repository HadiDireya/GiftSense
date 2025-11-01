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
      className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition ${
        isSaved
          ? "border-rose-500 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-400 dark:text-rose-300 dark:hover:bg-rose-500/10"
          : "border-slate-300 text-slate-700 hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-200"
      } disabled:cursor-not-allowed disabled:opacity-60`}
      aria-pressed={isSaved}
    >
      {isSaved ? "Remove" : "Save to Wish List"}
    </button>
  );
};
