import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { listChatSessions, deleteChatSession, renameChatSession } from "../lib/chatHistory";
import { getFirebaseAuth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ConfirmDialog } from "./ConfirmDialog";

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string | null) => void;
  currentSessionId: string | null;
  variant?: "overlay" | "inline";
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
  }

  return sessionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sessionDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined
  });
};

export const ChatHistorySidebar = ({
  isOpen,
  onClose,
  onSelectSession,
  currentSessionId,
  variant = "overlay"
}: ChatHistorySidebarProps) => {
  const isInline = variant === "inline";
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const isVisible = isInline || isOpen;

  const {
    data: sessions = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["chatSessions"],
    queryFn: listChatSessions,
    enabled: isAuthenticated && isVisible,
    refetchOnMount: true,
    staleTime: 0
  });

  useEffect(() => {
    if (!isInline && isOpen && isAuthenticated) {
      const timer = setTimeout(() => {
        refetch();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAuthenticated, isInline, refetch]);

  const handleNewChat = useCallback(() => {
    onSelectSession(null);
    if (!isInline && window.innerWidth < 1024) {
      onClose();
    }
  }, [isInline, onClose, onSelectSession]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      onSelectSession(sessionId);
      if (!isInline && window.innerWidth < 1024) {
        onClose();
      }
    },
    [isInline, onClose, onSelectSession]
  );

  const handleDeleteClick = useCallback((sessionId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowDeleteConfirm(sessionId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const sessionId = showDeleteConfirm;
    if (!sessionId) return;

    setShowDeleteConfirm(null);
    setDeletingSessionId(sessionId);
    try {
      await deleteChatSession(sessionId);
      if (currentSessionId === sessionId) {
        onSelectSession(null);
      }
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      alert("Failed to delete chat session. Please try again.");
    } finally {
      setDeletingSessionId(null);
    }
  }, [showDeleteConfirm, currentSessionId, onSelectSession, queryClient]);

  const handleRenameClick = useCallback((sessionId: string, currentName: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setRenamingSessionId(sessionId);
    setRenameInput(currentName || "");
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    const sessionId = renamingSessionId;
    if (!sessionId) return;

    try {
      await renameChatSession(sessionId, renameInput.trim());
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

  const historyContent = !isAuthenticated ? (
    <div className="rounded-2xl border border-white/30 bg-white/50 px-5 py-10 text-center text-sm font-medium text-slate-600 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      Sign in with Google to revisit your past conversations.
    </div>
  ) : isLoading ? (
    <div className="space-y-3">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="h-20 animate-pulse rounded-2xl border border-white/30 bg-white/40 shadow-soft dark:border-white/10 dark:bg-white/5"
        />
      ))}
    </div>
  ) : sessions.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-white/40 bg-white/40 px-5 py-12 text-center text-sm text-slate-600 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      <p className="font-semibold">No saved chats yet</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Start a conversation to see it appear here.</p>
    </div>
  ) : (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isActive = currentSessionId === session.id;
        return (
          <div
            key={session.id}
            className={`group relative overflow-hidden rounded-2xl border border-white/30 bg-white/55 shadow-soft backdrop-blur-glass transition-all duration-200 dark:border-white/10 dark:bg-white/10 ${
              isActive ? "ring-2 ring-brand/40" : "hover:-translate-y-1 hover:shadow-soft-lg"
            }`}
          >
            <button
              onClick={() => handleSelectSession(session.id)}
              className="block w-full px-5 py-4 text-left"
              disabled={deletingSessionId === session.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={`truncate text-sm font-semibold ${
                      isActive ? "text-brand dark:text-brand-light" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {session.customName || formatSessionDate(session.date)}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                    {session.preview || "No preview yet"}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {session.messageCount} message{session.messageCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-soft dark:bg-white/10 dark:text-slate-300">
                  {formatSessionDate(session.date)}
                </span>
              </div>
            </button>
            <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
              <button
                onClick={(event) => handleRenameClick(session.id, session.customName || "", event)}
                disabled={deletingSessionId === session.id}
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white/80 text-slate-500 shadow-soft transition-colors duration-200 hover:bg-brand/10 hover:text-brand dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-brand/20 dark:hover:text-brand-light"
                aria-label="Rename chat"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487l3.651 3.651m-2.32-6.012a2.5 2.5 0 013.535 3.535L7.5 18.889 3 20l1.111-4.5 13.082-13.025z" />
                </svg>
              </button>
              <button
                onClick={(event) => handleDeleteClick(session.id, event)}
                disabled={deletingSessionId === session.id}
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white/80 text-slate-500 shadow-soft transition-colors duration-200 hover:bg-rose-100 hover:text-rose-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-200"
                aria-label="Delete chat"
              >
                {deletingSessionId === session.id ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 12a8 8 0 10-8 8" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const inlineContainer = (
    <div id="chat-history-panel" className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">History</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Pick up where you left off.</p>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-mint px-4 py-2 text-xs font-semibold text-white shadow-soft"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
          </svg>
          New
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">{historyContent}</div>
    </div>
  );

  const overlayContainer = (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-full max-w-sm transform border border-white/40 bg-white/80 p-6 shadow-soft backdrop-blur-glass transition-transform duration-300 dark:border-white/10 dark:bg-charcoal/85 lg:relative lg:z-auto lg:h-auto lg:max-w-none lg:rounded-[28px] ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">History</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Saved conversations</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/70 text-slate-600 shadow-soft transition-colors duration-200 hover:bg-brand/10 hover:text-brand dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-brand/20 dark:hover:text-brand-light lg:hidden"
              aria-label="Close history"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand via-mint to-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-soft transition-transform duration-200 hover:scale-105"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
            New chat
          </button>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">{historyContent}</div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      {isInline ? inlineContainer : overlayContainer}
      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        title="Delete chat session"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(null)}
      />

      {renamingSessionId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleRenameCancel} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl border border-white/40 bg-white/85 p-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/90"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rename conversation</h3>
              <input
                type="text"
                value={renameInput}
                onChange={(event) => setRenameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleRenameConfirm();
                  }
                  if (event.key === "Escape") {
                    handleRenameCancel();
                  }
                }}
                placeholder="Give this chat a memorable name"
                className="mt-4 w-full rounded-xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-soft outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                autoFocus
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRenameCancel}
                  className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-soft transition hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameConfirm}
                  className="rounded-full bg-gradient-to-r from-brand to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:scale-105"
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
