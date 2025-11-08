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
      className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-white/8 backdrop-blur-md shadow-[0_8px_25px_rgba(0,0,0,0.18)] transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)] py-4 px-5 max-w-xs dark:bg-white/6"
      aria-label={product.title}
    >
      <div>
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="h-40 w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-xl bg-black/80 backdrop-blur-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-soft dark:bg-white/90 dark:text-slate-900">
            {storeLabel[product.store]}
          </span>
        </div>
        <div className="space-y-3">
          <header>
            <h3 className="text-lg font-semibold text-slate-900 leading-snug dark:text-slate-100 line-clamp-2">
              {product.title}
            </h3>
            <p className="mt-2 text-sm opacity-70 line-clamp-2 dark:opacity-70">
              {product.description_short}
            </p>
          </header>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-transparent dark:bg-[#ffffff0a] px-3 py-2">
            <span className="text-xl font-semibold text-[#ff7c39] dark:text-[#ff9d62]">
              {formattedPrice}
            </span>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 shadow-soft text-[#1a1a1a] dark:text-white">
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-bold">
                {product.rating.value.toFixed(1)}
              </span>
              <span className="text-xs">
                ({product.rating.count})
              </span>
            </div>
          </div>
          {explanation ? (
            <details className="border-[1.5px] border-brand/35 rounded-full py-2 px-4 text-sm text-[#444] dark:text-[#dcdcdc] hover:border-brand/60">
              <summary className="cursor-pointer text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                Why this pick
              </summary>
              <p className="mt-3 leading-relaxed font-medium">{explanation}</p>
            </details>
          ) : null}
        </div>
      </div>
      <footer className="flex gap-3 px-5 py-4">
        <a
          href={product.affiliate_url}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="flex-1 rounded-full bg-gradient-to-r from-[#ff9460] to-[#ff7c39] px-4 py-2.5 text-center text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:brightness-110 dark:from-[#ff6b2e] dark:to-[#ff4d1c]"
        >
          Buy Now
        </a>
        <WishlistButton product={product} />
      </footer>
    </article>
  );
};
