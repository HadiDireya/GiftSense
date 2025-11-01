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
        const alignment = isUser ? "items-end" : "items-start";
        const bubbleStyle = isUser
          ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-glow"
          : "bg-white/90 backdrop-blur-sm text-slate-900 border border-slate-200/50 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700/50";
        const infoStyle =
          message.variant === "info"
            ? "border-2 border-brand/40 bg-gradient-to-br from-brand/10 to-brand/5 text-brand shadow-soft dark:border-brand/50 dark:from-brand/20 dark:to-brand/10"
            : "";
        const errorStyle =
          message.variant === "error"
            ? "border-2 border-rose-400/60 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 shadow-soft dark:border-rose-600/60 dark:from-rose-500/20 dark:to-rose-500/10 dark:text-rose-200"
            : "";

        return (
          <li key={message.id} className={`flex flex-col ${alignment} animate-fade-in`}>
            <div className={`chat-bubble max-w-[85%] sm:max-w-[65%] ${bubbleStyle} ${infoStyle} ${errorStyle} leading-relaxed`}>
              {message.content}
            </div>
            {/* Show options as buttons if available */}
            {message.options && message.options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 max-w-[85%] sm:max-w-[65%]">
                {message.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onQuickReply(option)}
                    className="rounded-xl border-2 border-brand/50 bg-gradient-to-br from-brand/10 to-brand/5 px-5 py-2.5 text-sm font-semibold text-brand shadow-soft transition-all duration-200 hover:scale-105 hover:border-brand hover:bg-gradient-to-br hover:from-brand/20 hover:to-brand/10 hover:shadow-glow dark:border-brand/60 dark:from-brand/20 dark:to-brand/10 dark:text-brand-light"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      }),
    [messages, onQuickReply]
  );

  return (
    <section className="flex h-full flex-col gap-6 overflow-y-auto rounded-3xl border-2 border-slate-200/60 bg-gradient-to-br from-white/95 via-white to-white/95 p-6 shadow-soft-lg dark:border-slate-700/60 dark:from-slate-900/95 dark:via-slate-900 dark:to-slate-900/95">
      <ul className="flex flex-1 flex-col gap-4">{messageItems}</ul>

      {isLoading ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="chat-bubble max-w-sm bg-white/90 backdrop-blur-sm border border-slate-200/50 text-slate-600 dark:bg-slate-800/90 dark:border-slate-700/50 dark:text-slate-300">
            Trendella is pulling in fresh products...
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
          <div className="chat-bubble bg-gradient-to-br from-brand/10 to-brand/5 border-2 border-brand/30 text-slate-800 dark:from-brand/20 dark:to-brand/10 dark:border-brand/40 dark:text-slate-200 shadow-soft">
            Here are the top matches based on what you shared.
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
          <div className="chat-bubble bg-white/90 backdrop-blur-sm border border-slate-200/50 text-slate-700 dark:bg-slate-800/90 dark:border-slate-700/50 dark:text-slate-200">
            Gemini also pulled search links you can explore directly:
          </div>
          <div className="flex flex-wrap gap-2">
            {geminiLinks.map((link) => (
              <a
                key={`${link.store}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-brand/50 bg-gradient-to-br from-brand/10 to-brand/5 px-4 py-2.5 text-sm font-semibold text-brand shadow-soft transition-all duration-200 hover:scale-105 hover:border-brand hover:from-brand/20 hover:to-brand/10 hover:shadow-glow dark:border-brand/60 dark:from-brand/20 dark:to-brand/10 dark:text-brand-light"
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
              className="rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-soft transition-all duration-200 hover:scale-105 hover:border-brand hover:bg-gradient-to-br hover:from-brand/10 hover:to-brand/5 hover:text-brand hover:shadow-glow dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:from-brand/20 dark:hover:to-brand/10"
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
