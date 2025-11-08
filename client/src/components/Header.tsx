import { useNavigate } from "react-router-dom";
import { AuthButton } from "./AuthButton";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  handleSelectSession?: (sessionId: string | null) => void;
  currentSessionId?: string | null;
  activeTab?: "chat" | "wishlist";
  showSidebarButtons?: boolean;
}

export const Header = ({
  isSidebarOpen = false,
  setIsSidebarOpen = () => {},
  handleSelectSession,
  //currentSessionId,
  activeTab = "chat",
  showSidebarButtons = true,
}: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between p-6 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        {showSidebarButtons && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shadow-sm transition-all duration-200 hover:scale-105"
            aria-label="Toggle chat history"
          >
            {isSidebarOpen ? (
              <>
                <svg className="w-4 h-4 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Hide History
              </>
            ) : (
              <>
                <svg className="w-4 h-4 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Show History
              </>
            )}
          </button>
        )}
        {showSidebarButtons && handleSelectSession && (
          <button
            onClick={() => handleSelectSession(null)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shadow-sm transition-all duration-200 hover:scale-105"
            aria-label="Start new chat"
          >
            <svg className="w-4 h-4 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        )}
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-200 hover:scale-105 ${
            activeTab === "chat"
              ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
              : "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
          aria-label={activeTab === "chat" ? "Current chat" : "Go to chat"}
          onClick={() => activeTab !== "chat" && navigate("/chatbot")}
        >
          <svg className="w-4 h-4 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-200 hover:scale-105 ${
            activeTab === "wishlist"
              ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
              : "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
          aria-label={activeTab === "wishlist" ? "Current wish list" : "Go to wish list"}
          onClick={() => activeTab !== "wishlist" && navigate("/wishlist")}
        >
          <svg className="w-4 h-4 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Wish List
        </button>
        <AuthButton />
      </div>
      <ThemeToggle />
    </div>
  );
};
