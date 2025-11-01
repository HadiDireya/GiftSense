import { useMemo } from "react";
import type { NormalizedProduct } from "../lib/api";
import { WishlistButton } from "./WishlistButton";

interface ProductCardProps {
  product: NormalizedProduct;
  explanation?: string;
}

const storeLabel: Record<NormalizedProduct["store"], string> = {
  amazon: "Amazon",
  aliexpress: "AliExpress",
  shein: "SHEIN",
  ebay: "eBay",
  etsy: "Etsy",
  bestbuy: "Best Buy"
};

export const ProductCard = ({ product, explanation }: ProductCardProps) => {
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: product.price.currency,
      maximumFractionDigits: 2
    }).format(product.price.value);
  }, [product.price.currency, product.price.value]);

  return (
    <article
      className="flex h-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      aria-label={product.title}
    >
      <div>
        <div className="relative">
          <img
            src={product.image}
            alt={product.title}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-white/80 dark:text-slate-900">
            {storeLabel[product.store]}
          </span>
        </div>
        <div className="space-y-3 p-4">
          <header>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {product.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {product.description_short}
            </p>
          </header>
          <div className="flex items-center justify-between text-sm">
            <span className="text-lg font-semibold text-brand">{formattedPrice}</span>
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Rating {product.rating.value.toFixed(1)} ({product.rating.count})
            </span>
          </div>
          {explanation ? (
            <details className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm text-slate-700 dark:border-brand/30 dark:bg-brand/10 dark:text-slate-200">
              <summary className="cursor-pointer text-sm font-semibold text-brand dark:text-brand-light">
                Why this pick
              </summary>
              <p className="mt-2 leading-relaxed">{explanation}</p>
            </details>
          ) : null}
        </div>
      </div>
      <footer className="flex gap-3 px-4 pb-4">
        <a
          href={product.affiliate_url}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="flex-1 rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Buy
        </a>
        <WishlistButton product={product} />
      </footer>
    </article>
  );
};
