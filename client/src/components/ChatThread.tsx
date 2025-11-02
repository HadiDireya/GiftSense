import { useEffect, useMemo, useRef } from "react";
import type { GeminiLinkSuggestion, NormalizedProduct } from "../lib/api";
import { ProductCard } from "./ProductCard";
import { SkeletonCard } from "./SkeletonCard";

export type ChatAuthor = "assistant" | "user" | "system";

export interface ChatMessage {
  id: string;
  sender: ChatAuthor;
  content: string;
  variant?: "default" | "info" | "error";
  options?: string[]; // Optional button options for quick selection
}

interface ChatThreadProps {
  messages: ChatMessage[];
  products: NormalizedProduct[];
  geminiLinks: GeminiLinkSuggestion[];
  explanations: Record<string, string>;
  followUps: string[];
  isLoading: boolean;
  onQuickReply: (text: string) => void;
}

export const ChatThread = ({
  messages,
  products,
  geminiLinks,
  explanations,
  followUps,
  isLoading,
  onQuickReply
}: ChatThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, products, geminiLinks, isLoading]);

  const messageItems = useMemo(
    () =>
      messages.map((message) => {
        const isUser = message.sender === "user";
        const alignment = isUser ? "flex-row-reverse" : "flex-row";
        const bubbleStyle = isUser
          ? "bg-gradient-to-r from-brand via-mint/80 to-brand-dark text-white shadow-glow"
          : "bg-white/75 backdrop-blur-glass text-slate-900 border border-white/40 dark:bg-white/10 dark:text-slate-100 dark:border-white/10";
        const infoStyle =
          message.variant === "info"
            ? "border border-brand/40 bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light"
            : "";
        const errorStyle =
          message.variant === "error"
            ? "border border-rose-400/60 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/20 dark:text-rose-200"
            : "";

        return (
          <li key={message.id} className={`flex ${alignment} items-start gap-3 animate-fade-in`}>
            <span
              className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-soft ${
                isUser
                  ? "bg-gradient-to-br from-brand to-mint text-white"
                  : "bg-white/80 text-brand dark:bg-white/10 dark:text-brand-light"
              }`}
            >
              {isUser ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 21a7 7 0 0114 0" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
            </span>
            <div className={`flex max-w-[82%] flex-col gap-2 sm:max-w-[65%] ${isUser ? "items-end" : "items-start"}`}>
              <div className={`chat-bubble ${bubbleStyle} ${infoStyle} ${errorStyle} leading-relaxed`}>{message.content}</div>
              {message.options && message.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onQuickReply(option)}
                      className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-brand shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-brand-light"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      }),
    [messages, onQuickReply]
  );

  return (
    <section className="flex h-full flex-col gap-6 overflow-y-auto pr-1">
      <ul className="flex flex-1 flex-col gap-4">{messageItems}</ul>

      {isLoading ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="chat-bubble max-w-sm border border-white/40 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
            Trendella is curating fresh gifts for you…
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : null}

      {products.length > 0 && !isLoading ? (
        <div className="space-y-5 animate-slide-up">
          <div className="chat-bubble border border-brand/40 bg-brand/10 text-slate-800 shadow-soft dark:border-brand/50 dark:bg-brand/20 dark:text-slate-200">
            Here are the top matches tuned to their personality.
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                explanation={explanations[product.id]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {geminiLinks.length > 0 && !isLoading ? (
        <div className="space-y-3 animate-fade-in">
          <div className="chat-bubble border border-white/40 bg-white/70 text-slate-700 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            Gemini also pulled search links you can explore directly:
          </div>
          <div className="flex flex-wrap gap-2">
            {geminiLinks.map((link) => (
              <a
                key={`${link.store}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:bg-brand/20 dark:border-brand/50 dark:bg-brand/15 dark:text-brand-light"
              >
                {link.store.toUpperCase()}: {link.query}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {followUps.length > 0 ? (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {followUps.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
              onClick={() => onQuickReply(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={bottomRef} />
    </section>
  );
};
