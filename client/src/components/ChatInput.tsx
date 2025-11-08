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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeTextarea = useCallback(() => {
  const node = textareaRef.current;
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, []);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    console.log("Selected file:", file);
  };

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
  className="mt-5 flex items-center gap-3 rounded-3xl bg-white border border-[rgba(0,0,0,0.08)] dark:bg-[rgba(0,0,0,0.35)] dark:border-[rgba(255,255,255,0.12)] dark:backdrop-blur-[12px] py-4 px-6 shadow-[0_0_5px_rgba(0,0,0,0.05)] transition-all duration-200"
  >
  <div className="flex items-center gap-3 mr-2">
  <button
  type="button"
  onClick={handleAttachmentClick}
  className="p-2 rounded-full text-[#404040] dark:text-[#e6e6e6] transition-opacity duration-250 ease opacity-70 hover:opacity-100"
  aria-label="Attach file"
  >
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
  </button>
  <button
  type="button"
  className="p-2 rounded-full text-[#404040] dark:text-[#e6e6e6] transition-opacity duration-250 ease opacity-70 hover:opacity-100"
  aria-label="Magic actions"
  >
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
  </button>
  </div>
  <textarea
  ref={textareaRef}
  value={value}
  onChange={(event) => setValue(event.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={placeholder ?? "Tell me about the recipient or refine the ideas..."}
  className="min-h-[44px] max-h-[160px] flex-1 resize-none bg-transparent text-[15px] font-medium text-neutral-800 dark:text-neutral-200 outline-none placeholder:text-[#a9a9a9] dark:placeholder:text-[#777] leading-[1.4]"
  disabled={isDisabled}
  aria-label="Gift chat message"
  />
    <button
    type="submit"
    disabled={isDisabled || value.trim().length === 0}
    className="rounded-xl p-2 w-11 h-11 flex justify-center items-center bg-[#ff9460] dark:bg-[#ff4800] text-white transition-opacity duration-250 ease opacity-90 hover:opacity-100 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:opacity-50"
    aria-label="Send message"
    >
        <svg
        className="h-[18px] w-[18px] transform rotate-45 block"
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
        <input
            type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
    </form>
  );
};
