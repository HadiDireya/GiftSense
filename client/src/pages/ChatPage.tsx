import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ChatInput } from "../components/ChatInput";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import {
  requestRecommendations,
  fetchWishlist,
  type RecommendResponse,
  type NormalizedProduct
} from "../lib/api";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile, type RecipientProfile } from "../state/profile";
import {
  saveChatSession,
  loadChatHistory,
  loadChatSession,
  createSessionId,
  getSessionId,
  historyMessageToChatMessage
} from "../lib/chatHistory";
import { Timestamp } from "firebase/firestore";
import { getFirebaseAuth, waitForAuthReady } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";

type Question = {
  key: keyof RecipientProfile | "budget" | "interests" | "favorite_brands";
  prompt: string;
  reprompt: string;
  parser: (input: string, profile: RecipientProfile) => Partial<RecipientProfile> | null;
  confirmation: (profile: RecipientProfile, parsed: Partial<RecipientProfile>) => string;
  options?: string[]; // Optional button options for quick selection
};

const makeId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 9)) ?? `${Date.now()}`;

const parseNumber = (input: string): number | null => {
  const match = input.match(/(\d{1,3})/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return value;
};

const parseCommaSeparated = (input: string): string[] => {
  return input
    .split(/[,/]| and /i)
    .map((value) => value.trim())
    .filter(Boolean);
};

const clampBudget = (min: number, max: number): [number, number] => {
  if (min > max && max > 0) {
    return [max, min];
  }
  if (max === 0) {
    return [min, min];
  }
  return [min, max];
};

const extractBudget = (input: string, current: RecipientProfile["budget"]) => {
  const matches = input.match(/\d+(?:\.\d{1,2})?/g);
  if (!matches || matches.length === 0) return null;
  const numbers = matches.map((num) => Number(num)).filter((num) => Number.isFinite(num));
  if (numbers.length === 0) return null;
  const currencyMatch = input.match(/(?<=\s|^)(usd|dollars|\$)/i);
  const currency = currencyMatch ? "USD" : current.currency;
  if (numbers.length === 1) {
    const value = numbers[0];
    return { budget: { min: value * 0.8, max: value, currency } };
  }
  const sorted = numbers.sort((a, b) => a - b);
  const [min, max] = clampBudget(sorted[0] ?? 0, sorted[sorted.length - 1] ?? 0);
  return { budget: { min, max, currency } };
};

const questionFlow: Question[] = [
  {
    key: "age",
    prompt: "First up, how old is the recipient?",
    reprompt: "Could you share their age with a number?",
    parser: (input) => {
      const age = parseNumber(input);
      if (!age) return null;
      return { age };
    },
    confirmation: (_profile, parsed) => `Got it — ${parsed.age} years young.`
  },
  {
    key: "gender",
    prompt: "What gender do they identify with?",
    reprompt: "Please select Male or Female.",
    options: ["Male", "Female"],
    parser: (input) => {
      const gender = input.trim();
      if (!gender) return null;
      // Accept both "male" and "Male" formats
      const lowerInput = gender.toLowerCase();
      if (lowerInput === "male") return { gender: "Male" };
      if (lowerInput === "female") return { gender: "Female" };
      return { gender };
    },
    confirmation: (_profile, parsed) =>
      parsed.gender ? `Noted — ${parsed.gender} vibes.` : "Skipping gender preference."
  },
  {
    key: "relationship",
    prompt: "What's your relationship to them?",
    reprompt: "Let me know how you're connected so I can match the tone.",
    options: ["Partner", "Sibling", "Parent", "Friend", "Coworker", "Other"],
    parser: (input) => {
      if (!input.trim()) return null;
      return { relationship: input.trim() };
    },
    confirmation: (_profile, parsed) => `Perfect — relationship set to ${parsed.relationship}.`
  },
  {
    key: "occasion",
    prompt: "What are you celebrating?",
    reprompt: "Any special occasion details to share?",
    options: ["Birthday", "Anniversary", "Graduation", "Wedding", "Baby Shower", "Holiday", "Thank You", "Other"],
    parser: (input) => {
      if (!input.trim()) return null;
      return { occasion: input.trim() };
    },
    confirmation: (_profile, parsed) => `Occasion logged: ${parsed.occasion}.`
  },
  {
    key: "budget",
    prompt: "What's your budget range in USD? (e.g., 40-80 or up to 120)",
    reprompt: "Try sharing a range like 30-60 USD so I can match price points.",
    parser: (input, profile) => extractBudget(input, profile.budget),
    confirmation: (_profile, parsed) =>
      `Budget locked: $${Math.round(parsed.budget?.min ?? 0)} to $${Math.round(
        parsed.budget?.max ?? 0
      )}.`
  },
  {
    key: "interests",
    prompt: "List a few of their core interests or hobbies (comma separated works!).",
    reprompt: "Drop a few interests separated by commas.",
    parser: (input) => {
      const values = parseCommaSeparated(input.toLowerCase());
      if (values.length === 0) return null;
      return { interests: values };
    },
    confirmation: (_profile, parsed) =>
      `Love it — focusing on ${parsed.interests?.join(", ")}.`
  },
  {
    key: "favorite_color",
    prompt: "Any favorite colors they gravitate toward?",
    reprompt: "Mention a color family so I can match the palette.",
    parser: (input) => {
      if (!input.trim()) return null;
      return { favorite_color: input.trim() };
    },
    confirmation: (_profile, parsed) => `Color preference saved: ${parsed.favorite_color}.`
  },
  {
    key: "favorite_brands",
    prompt: "Finally, any must-include brands or labels they adore?",
    reprompt: "Name any brands they love (comma separated works).",
    parser: (input) => {
      const values = parseCommaSeparated(input);
      if (values.length === 0) return null;
      return { favorite_brands: values };
    },
    confirmation: (_profile, parsed) =>
      `Brand affinity noted: ${parsed.favorite_brands?.join(", ")}.`
  }
];

const deriveConstraints = (input: string, profile: RecipientProfile) => {
  const constraints = { ...profile.constraints };
  const lowered = input.toLowerCase();

  const shippingMatch = lowered.match(/(\d+)\s*(?:day|days)/);
  if (shippingMatch) {
    constraints.shipping_days_max = Number(shippingMatch[1]);
  }

  if (/eco|sustain|planet/.test(lowered)) {
    if (!constraints.category_includes.includes("eco_friendly")) {
      constraints.category_includes = [...constraints.category_includes, "eco_friendly"];
    }
  }

  const categoryHints: Array<[RegExp, string]> = [
    [/tech|gadget|device/, "tech"],
    [/fitness|gym|workout/, "fitness"],
    [/beauty|skincare|makeup/, "beauty"],
    [/fashion|outfit|style/, "fashion"],
    [/home|decor|apartment|kitchen/, "home"],
    [/travel|trip|adventure/, "travel"],
    [/jewelry|ring|necklace|earring/, "accessories"],
    [/plant|green|garden|terrarium/, "plants"]
  ];

  categoryHints.forEach(([regex, category]) => {
    if (regex.test(lowered) && !constraints.category_includes.includes(category)) {
      constraints.category_includes = [...constraints.category_includes, category];
    }
  });

  if (/no\s+jewelry|avoid\s+jewelry/.test(lowered)) {
    constraints.category_excludes = [...constraints.category_excludes, "accessories"];
  }

  constraints.category_includes = Array.from(new Set(constraints.category_includes));
  constraints.category_excludes = Array.from(new Set(constraints.category_excludes));

  return constraints;
};

export const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId(),
      sender: "assistant",
      content: "Hi! I'm Trendella. Let's curate the perfect gift together."
    },
    {
      id: makeId(),
      sender: "assistant",
      content: questionFlow[0].prompt,
      options: questionFlow[0].options
    }
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Keep messagesRef in sync with messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { profile, updateProfile, isComplete } = useProfile();

  // Load chat history when authenticated user signs in
  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      await waitForAuthReady();
      const auth = getFirebaseAuth();
      
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        const authenticated = !!user;
        setIsAuthenticated(authenticated);

        if (authenticated && isMounted) {
          setIsLoadingHistory(true);
          try {
            // Try to load the most recent session with full state
            // First try today's session
            const todaySessionId = getSessionId();
            let sessionState = await loadChatSession(todaySessionId);
            
            // If today's session doesn't exist or is empty, try to get most recent
            if (!sessionState || sessionState.messages.length === 0) {
              const savedMessages = await loadChatHistory();
              if (savedMessages.length > 0) {
                // Legacy format - reconstruct basic state from messages
                const defaultProfileValue = {
                  age: null,
                  gender: null,
                  occasion: null,
                  budget: { min: 0, max: 0, currency: "USD" as const },
                  relationship: null,
                  interests: [],
                  favorite_color: null,
                  favorite_brands: [],
                  constraints: { category_includes: [], category_excludes: [] }
                };
                sessionState = {
                  messages: savedMessages.map(msg => ({
                    id: msg.id,
                    sender: msg.sender,
                    content: msg.content,
                    variant: msg.variant,
                    timestamp: Timestamp.now()
                  })),
                  recommendation: null,
                  profile: messagesRef.current.length > 2 ? profile : defaultProfileValue,
                  currentStep: 0,
                  sessionId: todaySessionId,
                  lastUpdated: Timestamp.now()
                };
                
                // Try to restore step from messages
                const answeredQuestions = savedMessages.filter(
                  (msg) => msg.sender === "user" && msg.content.trim().length > 0
                ).length;
                
                let lastQuestionIndex = 0;
                for (let i = savedMessages.length - 1; i >= 0; i--) {
                  const msg = savedMessages[i];
                  if (msg.sender === "assistant" && !msg.variant) {
                    const questionIndex = questionFlow.findIndex(
                      (q) => q.prompt === msg.content
                    );
                    if (questionIndex >= 0) {
                      lastQuestionIndex = questionIndex;
                      break;
                    }
                  }
                }
                sessionState.currentStep = Math.max(lastQuestionIndex, answeredQuestions);
              }
            }
            
            if (sessionState && sessionState.messages.length > 0 && isMounted) {
              // Restore complete session state
              setMessages(sessionState.messages.map(historyMessageToChatMessage));
              setCurrentSessionId(sessionState.sessionId);
              setCurrentStep(sessionState.currentStep);
              setRecommendation(sessionState.recommendation);
              
              // Restore profile if available
              if (sessionState.profile) {
                updateProfile(sessionState.profile);
              }
            } else if (isMounted) {
              // No saved history, but user just signed in - create new session
              const newSessionId = createSessionId();
              setCurrentSessionId(newSessionId);
              
              // If user started chatting before signing in, save current state
              const currentMessages = messagesRef.current;
              if (currentMessages.length > 2) {
                try {
                  await saveChatSession(
                    newSessionId,
                    currentMessages,
                    recommendation,
                    profile,
                    currentStep
                  );
                } catch (error) {
                  console.error("Failed to save current messages on sign-in:", error);
                }
              }
            }
          } catch (error) {
            console.error("Failed to load chat history:", error);
          } finally {
            if (isMounted) {
              setIsLoadingHistory(false);
            }
          }
        } else if (!authenticated && isMounted) {
          setIsLoadingHistory(false);
        }
      });

      return unsubscribe;
    };

    const unsubscribePromise = loadHistory();

    return () => {
      isMounted = false;
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  // Save complete chat session whenever state changes (for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || isLoadingHistory) {
      return;
    }

    // Don't save if we only have initial welcome messages and no session ID yet
    if (!currentSessionId && messages.length <= 2) {
      return;
    }

    // Ensure we have a session ID
    const sessionIdToUse = currentSessionId || createSessionId();
    if (!currentSessionId) {
      setCurrentSessionId(sessionIdToUse);
    }

    // Debounce saving to avoid too frequent writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveChatSession(
        sessionIdToUse,
        messages,
        recommendation,
        profile,
        currentStep
      ).catch((error) => {
        console.error("Failed to save chat session:", error);
      });
    }, 1000); // Save 1 second after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, recommendation, profile, currentStep, isAuthenticated, isLoadingHistory, currentSessionId]);

  // Handle session selection from sidebar
  const handleSelectSession = useCallback(
    async (sessionId: string | null) => {
      if (sessionId === null) {
        // Check if current chat has any user messages (not just initial assistant messages)
        const userMessages = messagesRef.current.filter(msg => msg.sender === "user");
        const hasUserMessages = userMessages.length > 0;
        
        // If current chat is new (only has 2 initial messages) and no user messages, prevent creating new chat
        if (messagesRef.current.length <= 2 && !hasUserMessages) {
          console.log("Cannot create new chat: current chat has no user messages yet");
          return; // Don't create a new chat if the current one hasn't been used
        }
        
        // New chat - save current session first if it has content
        if (isAuthenticated && currentSessionId && hasUserMessages) {
          // Clear any pending save timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          // Save current session immediately before starting new one
          try {
            await saveChatSession(
              currentSessionId,
              messagesRef.current,
              recommendation,
              profile,
              currentStep
            );
            console.log("Saved current session before starting new chat");
          } catch (error) {
            console.error("Failed to save current session before new chat:", error);
          }
        }

        // Create new unique session ID for the new chat
        const newSessionId = createSessionId();
        
        // Reset everything
        setMessages([
          {
            id: makeId(),
            sender: "assistant",
            content: "Hi! I'm Trendella. Let's curate the perfect gift together."
          },
          {
            id: makeId(),
            sender: "assistant",
            content: questionFlow[0].prompt,
            options: questionFlow[0].options
          }
        ]);
        setCurrentStep(0);
        setRecommendation(null);
        setCurrentSessionId(newSessionId);
        
        // Reset profile
        const defaultProfile = {
          age: null,
          gender: null,
          occasion: null,
          budget: { min: 0, max: 0, currency: "USD" as const },
          relationship: null,
          interests: [],
          favorite_color: null,
          favorite_brands: [],
          constraints: { category_includes: [], category_excludes: [] }
        };
        updateProfile(defaultProfile);
        
        // Wait a moment for the save to complete, then refresh sidebar
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
        }, 500);
      } else {
        // Load specific session - save current session first if needed
        if (isAuthenticated && currentSessionId && currentSessionId !== sessionId && messagesRef.current.length > 2) {
          // Clear any pending save timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          // Save current session before switching
          try {
            await saveChatSession(
              currentSessionId,
              messagesRef.current,
              recommendation,
              profile,
              currentStep
            );
            console.log("Saved current session before switching");
          } catch (error) {
            console.error("Failed to save current session before switching:", error);
          }
        }

          // Load the selected session
        setIsLoadingHistory(true);
        try {
          const sessionState = await loadChatSession(sessionId);
          console.log("Loaded session:", sessionId, sessionState ? "Found" : "Not found");
          
          if (sessionState && sessionState.messages.length > 0) {
            // Restore complete session state
            setMessages(sessionState.messages.map(historyMessageToChatMessage));
            setCurrentSessionId(sessionState.sessionId);
            setCurrentStep(sessionState.currentStep);
            setRecommendation(sessionState.recommendation);
            
            // Restore profile if available
            if (sessionState.profile) {
              updateProfile(sessionState.profile);
            }
          } else {
            console.warn("Session loaded but no messages found:", sessionId);
          }
        } catch (error) {
          console.error("Failed to load chat session:", error);
        } finally {
          setIsLoadingHistory(false);
        }
        
        // Refresh sidebar after loading
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
        }, 100);
      }
    },
    [updateProfile, queryClient, isAuthenticated, currentSessionId, recommendation, profile, currentStep]
  );

  useQuery<NormalizedProduct[]>({
    queryKey: ["wishlist"],
    queryFn: fetchWishlist,
    initialData: [] as NormalizedProduct[],
    refetchOnMount: false
  });

  useEffect(() => {
    if (recommendation?.products) {
      queryClient.setQueryData(["wishlist"], (existing: unknown) => existing ?? []);
    }
  }, [queryClient, recommendation]);

  const recommendMutation = useMutation({
    mutationFn: requestRecommendations,
    onSuccess: (data) => {
      setRecommendation(data);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "The recommendation service is unavailable.";
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          sender: "assistant",
          content: `Something went wrong fetching products: ${message}`,
          variant: "error"
        }
      ]);
    }
  });

  const askNextQuestion = useCallback((nextIndex: number) => {
    const nextQuestion = questionFlow[nextIndex];
    if (!nextQuestion) return;
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        sender: "assistant",
        content: nextQuestion.prompt,
        options: nextQuestion.options // Include options if available
      }
    ]);
  }, []);

  const finalizeProfile = useCallback(
    (nextProfile: RecipientProfile) => {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          sender: "assistant",
          content:
            "Amazing — we have a full profile. Add more details for higher specificity like delivery windows, aesthetics, or must-have categories while I pull curated ideas."
        }
      ]);
      recommendMutation.mutate(nextProfile);
    },
    [recommendMutation]
  );

  const handleQuestionFlow = useCallback(
    (input: string) => {
      const question = questionFlow[currentStep];
      if (!question) return;

      const parsed = question.parser(input, profile);
      if (!parsed) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            sender: "assistant",
            content: question.reprompt,
            variant: "info"
          }
        ]);
        return;
      }

      updateProfile(parsed);
      const nextProfile = { ...profile, ...parsed };
      if (parsed.budget) {
        nextProfile.budget = { ...profile.budget, ...parsed.budget };
      }
      if (parsed.interests) {
        nextProfile.interests = parsed.interests;
      }
      if (parsed.favorite_brands) {
        nextProfile.favorite_brands = parsed.favorite_brands;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          sender: "assistant",
          content: question.confirmation(nextProfile, parsed),
          variant: "info"
        }
      ]);

      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);

      if (nextIndex >= questionFlow.length) {
        finalizeProfile(nextProfile);
      } else {
        askNextQuestion(nextIndex);
      }
    },
    [askNextQuestion, currentStep, finalizeProfile, profile, updateProfile]
  );

  const handleRefine = useCallback(
    (input: string) => {
      const constraints = deriveConstraints(input, profile);
      const refinedProfile = { ...profile, constraints };
      updateProfile({ constraints });
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          sender: "assistant",
          content: "Refining the list with that detail..."
        }
      ]);
      recommendMutation.mutate(refinedProfile);
    },
    [profile, recommendMutation, updateProfile]
  );

  const handleSend = useCallback(
    (input: string) => {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), sender: "user", content: input }
      ]);
      if (!isComplete) {
        handleQuestionFlow(input);
      } else {
        handleRefine(input);
      }
    },
    [handleQuestionFlow, handleRefine, isComplete]
  );

  const handleQuickReply = useCallback(
    (content: string) => {
      handleSend(content);
    },
    [handleSend]
  );

  useEffect(() => {
    if ((location.state as { reaskFromWishlist?: boolean } | null)?.reaskFromWishlist) {
      navigate(".", { replace: true, state: {} });
      if (isComplete) {
        handleRefine("Please focus on the items saved to my wish list.");
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            sender: "assistant",
            content:
              "Once we finish the profile I’ll happily rework ideas around your wish list favorites."
          }
        ]);
      }
    }
  }, [handleRefine, isComplete, location.state, navigate]);

  const explanationMap = useMemo(() => {
    if (!recommendation) return {};
    return recommendation.explanations.reduce<Record<string, string>>((acc, item) => {
      acc[item.product_id] = item.why;
      return acc;
    }, {});
  }, [recommendation]);

  return (
    <div className="relative flex h-[calc(100vh-160px)] gap-4">
      {/* Sidebar */}
      <ChatHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Toggle Sidebar Button - Mobile */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-20 left-4 z-30 p-3 rounded-xl bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 border-2 border-slate-200/60 dark:border-slate-700/60 shadow-soft-lg hover:bg-gradient-to-br hover:from-brand/10 hover:to-brand/5 hover:border-brand/40 dark:hover:from-brand/20 dark:hover:to-brand/10 transition-all duration-200 hover:scale-110"
          aria-label="Toggle chat history"
        >
          <svg
            className="w-5 h-5 text-slate-700 dark:text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Desktop Controls */}
        <div className="hidden lg:flex items-center gap-3 mb-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-slate-200/60 bg-white/80 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/80 hover:bg-gradient-to-br hover:from-brand/10 hover:to-brand/5 hover:border-brand/40 dark:hover:from-brand/20 dark:hover:to-brand/10 text-slate-700 dark:text-slate-300 shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow"
            aria-label="Toggle chat history"
          >
            {isSidebarOpen ? "← Hide History" : "Show History →"}
          </button>
          <button
            onClick={() => handleSelectSession(null)}
            className="px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-brand/60 bg-gradient-to-br from-brand/10 to-brand/5 text-brand hover:from-brand hover:to-brand-dark hover:text-white hover:border-brand shadow-soft dark:from-brand/20 dark:to-brand/10 dark:text-brand-light transition-all duration-200 hover:scale-105 hover:shadow-glow flex items-center gap-2"
            aria-label="Start new chat"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Chat
          </button>
        </div>

        {/* Mobile New Chat Button */}
        <button
          onClick={() => handleSelectSession(null)}
          className="lg:hidden fixed top-20 right-4 z-30 p-3 rounded-full bg-brand text-white shadow-lg hover:bg-brand/90 transition flex items-center justify-center"
          aria-label="Start new chat"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        <ChatThread
          messages={messages}
          products={recommendation?.products ?? []}
          geminiLinks={recommendation?.meta.gemini_links ?? []}
          explanations={explanationMap}
          followUps={recommendation?.follow_up_suggestions ?? []}
          isLoading={recommendMutation.isPending}
          onQuickReply={handleQuickReply}
        />
        <ChatInput
          onSend={handleSend}
          isDisabled={recommendMutation.isPending}
          placeholder="Share more context or ask for tweaks…"
        />
      </div>
    </div>
  );
};
