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
      className="group flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/40 bg-white/70 shadow-soft backdrop-blur-glass transition-transform duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-white/10 dark:bg-white/10"
      aria-label={product.title}
    >
      <div>
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            {storeLabel[product.store]}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <div className="space-y-4 p-5">
          <header className="space-y-2">
            <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-white">
              {product.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300">
              {product.description_short}
            </p>
          </header>
          <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-soft dark:border-white/10 dark:bg-white/5">
            <span className="text-xl font-semibold text-slate-900 dark:text-white">{formattedPrice}</span>
            <div className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {product.rating.value.toFixed(1)}
              <span className="ml-1 text-[11px] font-normal text-slate-400 dark:text-slate-500">({product.rating.count})</span>
            </div>
          </div>
          {explanation ? (
            <details className="rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-slate-700 shadow-soft transition-colors duration-200 dark:border-brand/40 dark:bg-brand/20 dark:text-slate-100">
              <summary className="cursor-pointer text-sm font-semibold text-brand dark:text-brand-light">
                Why this pick
              </summary>
              <p className="mt-3 leading-relaxed">{explanation}</p>
            </details>
          ) : null}
        </div>
      </div>
      <footer className="flex gap-3 px-5 pb-5">
        <a
          href={product.affiliate_url}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="flex-1 rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark px-5 py-3 text-center text-sm font-semibold text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow"
        >
          Buy now
        </a>
        <WishlistButton product={product} />
      </footer>
    </article>
  );
};
