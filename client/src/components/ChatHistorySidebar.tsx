import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { listChatSessions, deleteChatSession, renameChatSession } from "../lib/chatHistory";
import { getFirebaseAuth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string | null) => void;
  currentSessionId: string | null;
}

const formatSessionDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sessionDate = new Date(date);
  sessionDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  if (sessionDate.getTime() === today.getTime()) {
    return "Today";
  } else if (sessionDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return sessionDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: sessionDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    });
  }
};

export const ChatHistorySidebar = ({
  isOpen,
  onClose,
  onSelectSession,
  currentSessionId
}: ChatHistorySidebarProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Check authentication state
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["chatSessions"],
    queryFn: listChatSessions,
    enabled: isAuthenticated && isOpen,
    refetchOnMount: true,
    staleTime: 0 // Always refetch when invalidated
  });
  
  // Refetch when sidebar opens to ensure we have the latest sessions
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Small delay to ensure any pending saves have completed
      const timer = setTimeout(() => {
        refetch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAuthenticated, refetch]);

  const handleNewChat = useCallback(() => {
    onSelectSession(null);
  }, [onSelectSession]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      onSelectSession(sessionId);
      // Don't close on desktop, only on mobile
      if (window.innerWidth < 1024) {
        onClose();
      }
    },
    [onSelectSession, onClose]
  );

  const handleDeleteClick = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(sessionId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const sessionId = showDeleteConfirm;
    if (!sessionId) return;

    setShowDeleteConfirm(null);
    setDeletingSessionId(sessionId);
    try {
      await deleteChatSession(sessionId);
      // If we deleted the currently active session, switch to new chat
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
      // Refresh the sessions list
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      alert("Failed to delete chat session. Please try again.");
    } finally {
      setDeletingSessionId(null);
    }
  }, [showDeleteConfirm, currentSessionId, onSelectSession, queryClient]);

  const handleRenameClick = useCallback((sessionId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(sessionId);
    setRenameInput(currentName || "");
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    const sessionId = renamingSessionId;
    if (!sessionId) return;

    try {
      await renameChatSession(sessionId, renameInput);
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
      setRenamingSessionId(null);
      setRenameInput("");
    } catch (error) {
      console.error("Failed to rename chat session:", error);
      alert("Failed to rename chat session. Please try again.");
    }
  }, [renamingSessionId, renameInput, queryClient]);

  const handleRenameCancel = useCallback(() => {
    setRenamingSessionId(null);
    setRenameInput("");
  }, []);

  return (
    <>
      {/* Overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
      className={`fixed lg:static left-0 top-0 h-full w-80 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 z-50 lg:z-auto flex flex-col shadow-xl lg:shadow-none transition-transform duration-300 rounded-l-3xl ${
      isOpen ? "translate-x-0" : "-translate-x-full"
      } ${!isOpen ? "lg:hidden" : ""}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 tracking-tight">
        Chat History
        </h2>
        <button
        onClick={onClose}
        className="p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-all duration-200 hover:scale-110"
        aria-label="Close sidebar"
        >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
       
        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-6">
        {!isAuthenticated ? (
        <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
        <p className="text-sm font-medium">Sign in with Google to view your chat history</p>
        </div>
        ) : isLoading ? (
        <div className="space-y-3">
        {[1, 2, 3].map((i) => (
        <div
        key={i}
        className="animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800 h-20"
        />
        ))}
        </div>
        ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
        <p className="text-sm font-medium">No chat history yet</p>
        <p className="text-xs mt-2 font-medium">Start a conversation to see it here</p>
        </div>
        ) : (
        <div className="space-y-3">
        {/* Search bar */}
        <div className="mb-4">
        <div className="relative">
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 opacity-80 hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
                    aria-label="Search conversations"
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-lavender-400 focus:border-lavender-400 transition-all duration-200"
                  />
                </div>
              </div>
        {/* New Chat Button */}
        <button
        onClick={handleNewChat}
        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
        currentSessionId === null
        ? "bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] border-[#FF7C39] dark:border-[#FF4800] text-white shadow-md"
        : "bg-[rgba(255,148,96,0.25)] border-[rgba(255,148,96,0.35)] text-[#ff9460] dark:bg-[rgba(255,120,64,0.18)] dark:border-[rgba(255,120,64,0.38)] dark:text-[#ff7c39] hover:bg-[rgba(255,148,96,0.275)] dark:hover:bg-[rgba(255,120,64,0.198)]"
        }`}
        >
        <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
        currentSessionId === null ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-800"
        }`}>
        <svg
        className="w-4 h-4 opacity-80 hover:opacity-100 transition"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        >
        <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M12 4v16m8-8H4"
        />
        </svg>
        </div>
        <span className={`font-medium text-sm ${currentSessionId === null ? "text-white" : "text-[#ff9460] dark:text-[#ff7c39]"}`}>New Chat</span>
        </div>
        </button>

              {/* Sessions List */}
              <div className="mt-6">
              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3 px-1">
              Recent Chats
              </h3>
              <div className="space-y-2">
              {sessions
              .filter((session) => {
              if (!searchTerm) return true;
              const needle = searchTerm.toLowerCase();
              const title = (session.customName || formatSessionDate(session.date) || "").toString().toLowerCase();
              const preview = (session.preview || "").toString().toLowerCase();
              return title.includes(needle) || preview.includes(needle);
              })
              .map((session) => (
              <div
              key={session.id}
              className={`relative group w-full rounded-lg border transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
              currentSessionId === session.id
              ? "bg-blue-50/50 border-blue-400 shadow-md dark:bg-blue-900/20"
              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              }`}
              >
              <button
              onClick={() => handleSelectSession(session.id)}
              className="w-full text-left p-4 pr-20"
              disabled={deletingSessionId === session.id}
              >
              <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${
              currentSessionId === session.id
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-800 dark:text-gray-200"
              }`}>
              {session.customName || formatSessionDate(session.date)}
              </p>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate mt-1.5">
              {session.preview || "No preview available"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 font-medium">
              {session.messageCount} message{session.messageCount !== 1 ? "s" : ""}
              </p>
              </div>
              </div>
              </button>
              {/* Action Buttons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              {/* Rename Button */}
              <button
              onClick={(e) => handleRenameClick(session.id, session.customName || "", e)}
              disabled={deletingSessionId === session.id}
              className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:text-blue-600 shadow-sm transition-all duration-200 hover:scale-110 disabled:opacity-50"
              aria-label={`Rename chat session`}
              >
              <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              >
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
              </svg>
              </button>
              {/* Delete Button */}
              <button
              onClick={(e) => handleDeleteClick(session.id, e)}
              disabled={deletingSessionId === session.id}
              className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-800 dark:text-neutral-200 hover:text-red-600 shadow-sm transition-all duration-200 hover:scale-110 disabled:opacity-50"
              aria-label={`Delete chat session`}
              >
              {deletingSessionId === session.id ? (
              <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              >
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
              </svg>
              ) : (
              <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              >
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
              </svg>
              )}
              </button>
              </div>
              </div>
              ))}
              </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        title="Delete Chat Session"
        message="Are you sure you want to delete this chat session? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(null)}
      />

      {/* Rename Dialog */}
      {renamingSessionId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={handleRenameCancel}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-4 tracking-tight">
              Rename Chat Session
              </h3>
              <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === "Enter") {
              handleRenameConfirm();
              } else if (e.key === "Escape") {
              handleRenameCancel();
              }
              }}
              placeholder="Enter a name for this chat..."
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-lavender-400 focus:border-lavender-400 mb-5 transition-all duration-200"
              autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                onClick={handleRenameCancel}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105 text-neutral-700 dark:text-neutral-300"
                >
                Cancel
                </button>
                <button
                onClick={handleRenameConfirm}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] text-white hover:scale-105 shadow-md transition-all duration-200"
                >
                Save
                </button>
              </div>
            </div>
          </div>

        </>
      )}
    </>
  );
};

