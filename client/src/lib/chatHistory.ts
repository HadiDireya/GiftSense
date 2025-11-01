import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  deleteDoc
} from "firebase/firestore";
import { getFirestoreClient, getFirebaseAuth } from "./firebase";
import type { ChatMessage } from "../components/ChatThread";
import type { RecommendResponse } from "./api";
import type { RecipientProfile } from "../state/profile";

export interface ChatHistoryMessage {
  id: string;
  sender: ChatMessage["sender"];
  content: string;
  variant?: ChatMessage["variant"];
  timestamp: Timestamp;
}

export interface ChatSessionState {
  messages: ChatHistoryMessage[];
  recommendation: RecommendResponse | null;
  profile: RecipientProfile;
  currentStep: number;
  sessionId: string;
  lastUpdated: Timestamp;
  customName?: string; // Optional custom name for the chat
}

const COLLECTION_NAME = "chatHistory";
const MAX_MESSAGES_PER_SESSION = 1000; // Limit to prevent excessive storage

/**
 * Converts a ChatMessage to Firestore-compatible format
 */
const messageToFirestore = (message: ChatMessage): Omit<ChatHistoryMessage, "timestamp"> => {
  const result: Omit<ChatHistoryMessage, "timestamp"> = {
    id: message.id,
    sender: message.sender,
    content: message.content
  };
  
  // Only include variant if it's defined (Firestore doesn't allow undefined)
  if (message.variant !== undefined) {
    result.variant = message.variant;
  }
  
  return result;
};

/**
 * Converts a ChatHistoryMessage to ChatMessage (removes timestamp)
 */
export const historyMessageToChatMessage = (historyMsg: ChatHistoryMessage): ChatMessage => {
  const result: ChatMessage = {
    id: historyMsg.id,
    sender: historyMsg.sender,
    content: historyMsg.content
  };
  
  // Only include variant if it exists
  if (historyMsg.variant !== undefined) {
    result.variant = historyMsg.variant;
  }
  
  return result;
};

/**
 * Gets a new unique session ID (timestamp-based)
 */
export const createSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Gets the current session ID for date-based sessions (legacy support)
 */
export const getSessionId = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Saves the complete chat session state to Firestore for the authenticated user
 */
export const saveChatSession = async (
  sessionId: string,
  messages: ChatMessage[],
  recommendation: RecommendResponse | null,
  profile: RecipientProfile,
  currentStep: number
): Promise<void> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    // User is not authenticated, skip saving
    return;
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  // Store complete session state
  // Format: users/{userId}/chatHistory/{sessionId}
  const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);

  // Get existing messages if any
  const existingDoc = await getDoc(sessionRef);
  const existingMessages: ChatHistoryMessage[] = existingDoc.exists()
    ? (existingDoc.data().messages as ChatHistoryMessage[]) ?? []
    : [];

  // Merge with new messages, avoiding duplicates
  const messageMap = new Map<string, ChatHistoryMessage>();
  
  // Add existing messages
  existingMessages.forEach((msg) => {
    messageMap.set(msg.id, msg);
  });

  // Add new messages with current timestamp
  messages.forEach((msg) => {
    if (!messageMap.has(msg.id)) {
      messageMap.set(msg.id, {
        ...messageToFirestore(msg),
        timestamp: Timestamp.now()
      });
    }
  });

  // Convert back to array and sort by timestamp
  // Handle both Timestamp objects and plain numbers
  const getTimestampMillis = (ts: Timestamp | number): number => {
    if (ts instanceof Timestamp) {
      return ts.toMillis();
    }
    if (typeof ts === "number") {
      return ts;
    }
    // If it's an object with seconds/nanoseconds, convert it
    if (ts && typeof ts === "object" && "seconds" in ts) {
      const tsObj = ts as { seconds: number; nanoseconds?: number };
      return tsObj.seconds * 1000 + (tsObj.nanoseconds ?? 0) / 1000000;
    }
    return Date.now();
  };

  const allMessages = Array.from(messageMap.values())
    .sort((a, b) => getTimestampMillis(a.timestamp as any) - getTimestampMillis(b.timestamp as any))
    .slice(-MAX_MESSAGES_PER_SESSION) // Keep only the most recent messages
    // Ensure all timestamps are Firestore Timestamp objects
    .map((msg) => {
      let timestamp: Timestamp;
      if (msg.timestamp instanceof Timestamp) {
        timestamp = msg.timestamp;
      } else if (typeof msg.timestamp === "number") {
        timestamp = Timestamp.fromMillis(msg.timestamp);
      } else if (msg.timestamp && typeof msg.timestamp === "object" && "seconds" in msg.timestamp) {
        const tsObj = msg.timestamp as { seconds: number; nanoseconds?: number };
        timestamp = new Timestamp(tsObj.seconds, tsObj.nanoseconds ?? 0);
      } else {
        timestamp = Timestamp.now();
      }
      
      const cleaned: ChatHistoryMessage = {
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp
      };
      if (msg.variant !== undefined) {
        cleaned.variant = msg.variant;
      }
      return cleaned;
    });

  // Clean recommendation to remove undefined values
  let cleanedRecommendation: RecommendResponse | null = null;
  if (recommendation) {
    cleanedRecommendation = {
      ...recommendation,
      products: recommendation.products ?? [],
      explanations: recommendation.explanations ?? [],
      follow_up_suggestions: recommendation.follow_up_suggestions ?? [],
      products_ranked: recommendation.products_ranked ?? [],
      meta: {
        ...recommendation.meta,
        gemini_links: recommendation.meta.gemini_links ?? []
      }
    };
  }

  // Save complete session state to Firestore
  const sessionData: Omit<ChatSessionState, "sessionId"> = {
    messages: allMessages,
    recommendation: cleanedRecommendation,
    profile,
    currentStep,
    lastUpdated: Timestamp.now()
  };

  // Remove undefined values recursively
  const cleanData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanData);
    }
    if (typeof obj === "object") {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = cleanData(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  await setDoc(sessionRef, cleanData(sessionData), { merge: true });
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use saveChatSession instead
 */
export const saveChatHistory = async (_messages: ChatMessage[]): Promise<void> => {
  // This is now handled by saveChatSession with full state
  console.warn("saveChatHistory is deprecated. Use saveChatSession instead.");
};

/**
 * Loads the most recent chat history for the authenticated user
 */
export const loadChatHistory = async (): Promise<ChatMessage[]> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    // User is not authenticated, return empty array
    return [];
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  try {
    // Get the most recent session (today's session)
    const sessionId = getSessionId();
    const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      const messages = (data.messages as ChatHistoryMessage[]) ?? [];
      if (messages.length === 0) {
        return [];
      }
      return messages.map(historyMessageToChatMessage);
    }

    // If today's session doesn't exist, try to get the most recent session
    const historyRef = collection(firestore, "users", userId, COLLECTION_NAME);
    const historyQuery = query(historyRef, orderBy("lastUpdated", "desc"), limit(1));
    const historySnapshot = await getDocs(historyQuery);

    if (!historySnapshot.empty) {
      const mostRecentSession = historySnapshot.docs[0];
      const data = mostRecentSession.data();
      const messages = (data.messages as ChatHistoryMessage[]) ?? [];
      if (messages.length === 0) {
        return [];
      }
      return messages.map(historyMessageToChatMessage);
    }

    return [];
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
};

export interface ChatSession {
  id: string;
  date: Date;
  messageCount: number;
  preview: string;
  lastUpdated: Date;
  customName?: string; // Optional custom name for the chat
}

/**
 * Lists all chat sessions for the authenticated user
 */
export const listChatSessions = async (): Promise<ChatSession[]> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return [];
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  try {
    const historyRef = collection(firestore, "users", userId, COLLECTION_NAME);
    const historyQuery = query(historyRef, orderBy("lastUpdated", "desc"));
    const historySnapshot = await getDocs(historyQuery);

    const sessions: ChatSession[] = [];

    historySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const messages = (data.messages as ChatHistoryMessage[]) ?? [];
      
      if (messages.length === 0) return;

      const sessionId = docSnapshot.id;
      let sessionDate: Date;
      
      // Parse session ID - handle both date format (YYYY-MM-DD) and timestamp format (session_*)
      if (sessionId.includes("session_")) {
        // New format: extract timestamp from session_* ID
        const timestampMatch = sessionId.match(/session_(\d+)/);
        if (timestampMatch) {
          sessionDate = new Date(Number(timestampMatch[1]));
        } else {
          sessionDate = data.lastUpdated?.toDate() ?? new Date();
        }
      } else {
        // Legacy format: date-based session ID (YYYY-MM-DD)
        try {
          const [year, month, day] = sessionId.split("-").map(Number);
          sessionDate = new Date(year, month - 1, day);
        } catch {
          sessionDate = data.lastUpdated?.toDate() ?? new Date();
        }
      }

      // Get preview from last user message or last message (show last words)
      const userMessages = messages.filter((msg) => msg.sender === "user");
      const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const previewMessage = lastUserMessage || lastMessage;
      const preview = previewMessage
        ? previewMessage.content.slice(-50) // Get last 50 characters instead of first
        : "";

      // Handle lastUpdated - it might be a Timestamp or already a Date
      let lastUpdatedDate: Date;
      if (data.lastUpdated) {
        if (data.lastUpdated instanceof Timestamp) {
          lastUpdatedDate = data.lastUpdated.toDate();
        } else if (data.lastUpdated instanceof Date) {
          lastUpdatedDate = data.lastUpdated;
        } else if (data.lastUpdated.toDate && typeof data.lastUpdated.toDate === "function") {
          lastUpdatedDate = data.lastUpdated.toDate();
        } else if (typeof data.lastUpdated === "number") {
          lastUpdatedDate = new Date(data.lastUpdated);
        } else if (data.lastUpdated.seconds) {
          lastUpdatedDate = new Date(data.lastUpdated.seconds * 1000);
        } else {
          lastUpdatedDate = sessionDate;
        }
      } else {
        lastUpdatedDate = sessionDate;
      }

      sessions.push({
        id: sessionId,
        date: sessionDate,
        messageCount: messages.length,
        preview,
        lastUpdated: lastUpdatedDate,
        customName: data.customName // Include custom name if set
      });
    });

    return sessions;
  } catch (error) {
    console.error("Failed to list chat sessions:", error);
    return [];
  }
};

/**
 * Loads complete chat session state for a specific session
 */
export const loadChatSession = async (sessionId: string): Promise<ChatSessionState | null> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return null;
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  try {
    const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      const messages = (data.messages as ChatHistoryMessage[]) ?? [];
      
      // If no messages, return null
      if (messages.length === 0) {
        return null;
      }

      // Load full session state (new format) or just messages (legacy format)
      const sessionState: ChatSessionState = {
        messages,
        recommendation: data.recommendation ?? null,
        profile: data.profile ?? null,
        currentStep: data.currentStep ?? 0,
        sessionId,
        lastUpdated: data.lastUpdated ?? Timestamp.now()
      };

      return sessionState;
    }

    return null;
  } catch (error) {
    console.error("Failed to load chat session:", error);
    return null;
  }
};

/**
 * Deletes a specific chat session
 */
export const deleteChatSession = async (sessionId: string): Promise<void> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);
  await deleteDoc(sessionRef);
};

/**
 * Renames a chat session
 */
export const renameChatSession = async (sessionId: string, customName: string): Promise<void> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);
  await setDoc(sessionRef, { customName: customName.trim() || null }, { merge: true });
};

/**
 * Clears chat history for the authenticated user (optional utility)
 */
export const clearChatHistory = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return;
  }

  const firestore = getFirestoreClient();
  const userId = currentUser.uid;

  // Note: This would require getting all sessions and deleting them
  // For now, we'll just clear today's session as a simple implementation
  const sessionId = getSessionId();
  const sessionRef = doc(firestore, "users", userId, COLLECTION_NAME, sessionId);
  await setDoc(sessionRef, { messages: [] }, { merge: true });
};

