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
  welcomeLight: string;
  welcomeDark: string;
  currentUser: any;
}

export const ChatThread = ({
  messages,
  products,
  geminiLinks,
  explanations,
  followUps,
  isLoading,
  onQuickReply,
  welcomeLight,
  welcomeDark,
  currentUser
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
        ? "self-end ml-auto bg-neutral-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 border-2 border-[#FF7C39] dark:border-[#FF4800] rounded-2xl px-4 py-2 max-w-[70%] min-w-[120px] shadow-md text-sm md:text-base break-words"
        : "bg-neutral-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 shadow-lg hover:shadow-xl transition-all duration-200";
        const infoStyle =
        message.variant === "info"
        ? ""
        : "";
        const errorStyle =
        message.variant === "error"
        ? "border-2 border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200 shadow-lg"
        : "";

        return (
        <li key={message.id} className={`flex flex-col ${alignment} animate-fade-in`}>
        <div className="relative">
        {isUser ? null : (
            <svg className="absolute -top-2 -left-2 w-5 h-5 text-[#6EC4FF] dark:text-[#3A8DFF] opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              <div className={`${isUser ? '' : 'chat-bubble max-w-[85%] sm:max-w-[65%]'} ${bubbleStyle} ${infoStyle} ${errorStyle} leading-relaxed`}>
                {message.content}
              </div>
            </div>
            {/* Show options as buttons if available */}
            {message.options && message.options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 max-w-[85%] sm:max-w-[65%]">
                {message.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onQuickReply(option)}
                    className="rounded-full border bg-[rgba(255,124,57,0.12)] border-[rgba(255,124,57,0.28)] text-[rgba(0,0,0,0.85)] px-5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:bg-[rgba(255,124,57,0.18)] active:bg-[rgba(255,124,57,0.24)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,124,57,0.35)] cursor-pointer select-none hover:shadow-md dark:bg-[rgba(255,72,0,0.14)] dark:border-[rgba(255,72,0,0.35)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,72,0,0.20)] dark:active:bg-[rgba(255,72,0,0.26)] dark:focus:ring-[rgba(255,72,0,0.40)]"
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

  // Show welcome section when there are no messages or only initial messages
  const showWelcome = messages.length <= 2;

  return (
    <section className="flex h-full flex-col gap-6 overflow-y-auto bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl p-6 rounded-t-3xl rounded-b-none border border-white/20 dark:border-neutral-800/50 shadow-xl">
      {showWelcome && (
        <div className="flex flex-col items-center justify-center text-center py-10 space-y-3 select-none">
          {/* Light mode MP4 */}
          <video
            src={welcomeLight}
            autoPlay
            loop
            muted
            playsInline
            className="w-32 h-32 rounded-full object-cover block dark:hidden"
          />

          {/* Dark mode GIF */}
          <img
            src={welcomeDark}
            alt="welcome orb"
            className="w-32 h-32 rounded-full object-cover hidden dark:block"
          />

          <h1 className="mt-4 bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] bg-clip-text text-transparent font-semibold text-2xl">
            Hey, {currentUser?.displayName || "Stranger"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            What are we gifting today? I’m here to assist you
          </p>
        </div>
      )}
      <ul className="flex flex-1 flex-col gap-4">{messageItems}</ul>

      {isLoading ? (
        <div className="flex flex-col gap-4 animate-fade-in">
        <div className="chat-bubble max-w-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-lg">
        GiftSense is pulling in fresh products...
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
          <div className="chat-bubble bg-gradient-to-br from-lavender-400/10 to-lavender-400/5 border-2 border-lavender-400/30 text-neutral-800 dark:from-lavender-400/20 dark:to-lavender-400/10 dark:border-lavender-400/40 dark:text-neutral-200 shadow-lg">
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
      <div className="chat-bubble bg-white/70 dark:bg-neutral-800/70 backdrop-blur-xl border border-white/30 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-200 shadow-lg">
      Gemini also pulled search links you can explore directly:
      </div>
      <div className="flex flex-wrap gap-2">
      {geminiLinks.map((link) => (
      <a
      key={`${link.store}-${link.url}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border bg-[rgba(255,124,57,0.12)] border-[rgba(255,124,57,0.28)] text-[rgba(0,0,0,0.85)] px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:bg-[rgba(255,124,57,0.18)] active:bg-[rgba(255,124,57,0.24)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,124,57,0.35)] cursor-pointer select-none hover:shadow-lg dark:bg-[rgba(255,72,0,0.14)] dark:border-[rgba(255,72,0,0.35)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,72,0,0.20)] dark:active:bg-[rgba(255,72,0,0.26)] dark:focus:ring-[rgba(255,72,0,0.40)]"
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
              className="rounded-full border bg-[rgba(255,124,57,0.12)] border-[rgba(255,124,57,0.28)] text-[rgba(0,0,0,0.85)] px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:bg-[rgba(255,124,57,0.18)] active:bg-[rgba(255,124,57,0.24)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,124,57,0.35)] cursor-pointer select-none hover:shadow-lg dark:bg-[rgba(255,72,0,0.14)] dark:border-[rgba(255,72,0,0.35)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,72,0,0.20)] dark:active:bg-[rgba(255,72,0,0.26)] dark:focus:ring-[rgba(255,72,0,0.40)]"
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
