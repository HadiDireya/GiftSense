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
      className="flex items-end gap-3 rounded-2xl border-2 border-slate-200/60 bg-white/80 backdrop-blur-sm p-4 shadow-soft-lg transition-all duration-200 focus-within:border-brand focus-within:shadow-glow dark:border-slate-700/60 dark:bg-slate-900/80"
    >
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
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow disabled:cursor-not-allowed disabled:scale-100 disabled:bg-slate-400 disabled:shadow-none disabled:hover:shadow-none"
        aria-label="Send message"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </form>
  );
};
