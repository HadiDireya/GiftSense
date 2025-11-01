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
      className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:border-brand/30 dark:border-slate-700/60 dark:bg-slate-800/90 dark:hover:border-brand/40"
      aria-label={product.title}
    >
      <div>
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-xl bg-black/80 backdrop-blur-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-soft dark:bg-white/90 dark:text-slate-900">
            {storeLabel[product.store]}
          </span>
        </div>
        <div className="space-y-3 p-5">
          <header>
            <h3 className="text-base font-bold text-slate-900 leading-snug dark:text-slate-100 line-clamp-2">
              {product.title}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-600 line-clamp-2 dark:text-slate-400">
              {product.description_short}
            </p>
          </header>
          <div className="flex items-center justify-between rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-3">
            <span className="text-xl font-bold bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
              {formattedPrice}
            </span>
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-soft dark:bg-slate-800">
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {product.rating.value.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({product.rating.count})
              </span>
            </div>
          </div>
          {explanation ? (
            <details className="rounded-xl border-2 border-brand/30 bg-gradient-to-br from-brand/10 to-brand/5 p-4 text-sm text-slate-700 shadow-soft dark:border-brand/40 dark:from-brand/20 dark:to-brand/10 dark:text-slate-200">
              <summary className="cursor-pointer text-sm font-bold text-brand dark:text-brand-light hover:text-brand-dark dark:hover:text-brand-light">
                Why this pick
              </summary>
              <p className="mt-3 leading-relaxed font-medium">{explanation}</p>
            </details>
          ) : null}
        </div>
      </div>
      <footer className="flex gap-3 px-5 pb-5">
        <a
          href={product.affiliate_url}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="flex-1 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-5 py-3 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow"
        >
          Buy Now
        </a>
        <WishlistButton product={product} />
      </footer>
    </article>
  );
};
