import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

interface ChatInputProps {
  onSend: (value: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export const ChatInput = ({ onSend, isDisabled = false, placeholder }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setValue("");
      resizeTextarea();
    },
    [onSend, resizeTextarea, value]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || isDisabled) return;
      onSend(trimmed);
      setValue("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center gap-3 rounded-full border border-white/50 bg-white/80 px-5 py-3 shadow-soft backdrop-blur-glass transition-all duration-200 focus-within:border-brand/60 focus-within:shadow-glow dark:border-white/10 dark:bg-white/10"
    >
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/70 text-slate-500 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
        aria-label="Add attachment"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3 3 0 014.24 4.24l-9.2 9.19a1 1 0 01-1.41-1.41l8.13-8.12" />
        </svg>
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Tell me about the recipient or refine the ideas..."}
        className="min-h-[48px] max-h-[160px] flex-1 resize-none bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        disabled={isDisabled}
        aria-label="Gift chat message"
      />
      <button
        type="submit"
        disabled={isDisabled || value.trim().length === 0}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:-translate-y-0 disabled:bg-slate-400 disabled:text-slate-200"
        aria-label="Send message"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
};
