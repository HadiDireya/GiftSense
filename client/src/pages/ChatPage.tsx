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

interface WelcomeHeroProps {
  onStart: () => void;
  isLoadingHistory: boolean;
}

const WelcomeHero = ({ onStart, isLoadingHistory }: WelcomeHeroProps) => {
  const stats = [
    {
      label: "Gift delight score",
      value: "92%",
      description: "Recipients said their present felt deeply personal"
    },
    {
      label: "Concierge availability",
      value: "24/7",
      description: "Ideas arrive in seconds whenever inspiration strikes"
    },
    {
      label: "Personalization lift",
      value: "3×",
      description: "More tailored than browsing marketplaces alone"
    }
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand/35 blur-3xl opacity-70" />
      <div className="absolute -right-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-mint/25 blur-3xl opacity-80" />
      <div className="relative grid gap-10 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            Gift Concierge
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl lg:text-6xl dark:text-white">
              AI-powered gifting that adapts to every personality.
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg dark:text-slate-300">
              Trendella listens to your recipient's vibe, favorite brands, and the occasion to deliver thoughtful present ideas
              with zero scrolling. Tap in to transform gifting into a bespoke experience.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onStart}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-charcoal"
            >
              {isLoadingHistory ? "Preparing your experience…" : "Start Chat"}
              {!isLoadingHistory ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6 6 6-6-6-6" />
                </svg>
              ) : null}
            </button>
            <div className="flex items-center gap-3 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand/30 to-mint/40 text-white">
                🎁
              </div>
              12k+ gift seekers guided every month
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 translate-y-10 rounded-[32px] bg-gradient-to-br from-brand/40 via-transparent to-mint/30 blur-3xl" />
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-brand/35 via-white/10 to-mint/30 p-8 shadow-soft backdrop-blur-glass dark:border-white/10 dark:from-brand/20 dark:via-charcoal/80 dark:to-mint/10">
            <div className="flex h-full flex-col justify-between gap-10 text-white">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                  Concierge insight
                </div>
                <p className="text-3xl font-semibold leading-snug">
                  “She said it's the most thoughtful gift she's ever received.”
                </p>
              </div>
              <div className="space-y-4 text-sm text-white/85">
                <p>
                  Trendella maps their interests, rituals, and wishlist to deliver inspired gifts in minutes.
                </p>
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/30 text-lg font-semibold text-white">
                    ✨
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Mood palette locked</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">Lavender · Mint · Lunar silver</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 right-4 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/70 dark:text-slate-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              Average profile completed in 43 seconds
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="flex flex-col gap-2 rounded-2xl border border-white/50 bg-white/70 p-6 text-left shadow-soft backdrop-blur-glass transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-white/10 dark:bg-charcoal/70"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              {stat.label}
            </span>
            <span className="text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</span>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{stat.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
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
  const [isWelcomeMounted, setIsWelcomeMounted] = useState(true);
  const [isWelcomeActive, setIsWelcomeActive] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  const transitionToChat = useCallback(
    (instant = false) => {
      setIsChatVisible(true);

      if (instant) {
        if (welcomeTimeoutRef.current) {
          clearTimeout(welcomeTimeoutRef.current);
        }
        setIsWelcomeActive(false);
        setIsWelcomeMounted(false);
        return;
      }

      setIsWelcomeActive((current) => {
        if (!current) {
          return current;
        }

        if (welcomeTimeoutRef.current) {
          clearTimeout(welcomeTimeoutRef.current);
        }

        welcomeTimeoutRef.current = setTimeout(() => {
          setIsWelcomeMounted(false);
        }, 600);

        return false;
      });
    },
    []
  );

  // Keep messagesRef in sync with messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (messages.some((message) => message.sender === "user")) {
      transitionToChat();
    }
  }, [messages, transitionToChat]);

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

  useEffect(() => {
    if (!isLoadingHistory) {
      const hasConversation =
        messagesRef.current.some((message) => message.sender === "user") ||
        messagesRef.current.length > 2;
      if (hasConversation) {
        transitionToChat(true);
      }
    }
  }, [isLoadingHistory, transitionToChat]);

  const explanationMap = useMemo(() => {
    if (!recommendation) return {};
    return recommendation.explanations.reduce<Record<string, string>>((acc, item) => {
      acc[item.product_id] = item.why;
      return acc;
    }, {});
  }, [recommendation]);

  const stepsRemaining = Math.max(questionFlow.length - currentStep, 0);
  const budgetRangeText =
    profile.budget.max > 0
      ? `$${Math.round(profile.budget.min)} – $${Math.round(profile.budget.max)}`
      : null;

  const featureCards = useMemo(
    () => [
      {
        title: "Gift Suggestions",
        description: isComplete
          ? "Refresh curated matches whenever inspiration strikes."
          : `Answer ${stepsRemaining} more prompt${stepsRemaining === 1 ? "" : "s"} to unlock bespoke picks.`,
        icon: (
          <svg className="h-10 w-10 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="17" r="3" />
          </svg>
        )
      },
      {
        title: "Occasion Filters",
        description: profile.occasion
          ? `Currently tuned for a ${profile.occasion.toLowerCase()} celebration.`
          : "Dial in the celebration to shape tone, sentiment, and etiquette.",
        icon: (
          <svg className="h-10 w-10 text-mint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v18M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="5" />
          </svg>
        )
      },
      {
        title: "Price Range",
        description: budgetRangeText
          ? `Budget anchored at ${budgetRangeText}. Adjust anytime.`
          : "Share a comfort range to balance splurge-worthy finds with savvy steals.",
        icon: (
          <svg className="h-10 w-10 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 8c-2.21 0-4 .79-4 2s1.79 2 4 2 4 .79 4 2-1.79 2-4 2-4-.79-4-2" strokeLinecap="round" />
            <path d="M12 6v12" strokeLinecap="round" />
          </svg>
        )
      }
    ],
    [budgetRangeText, isComplete, profile.occasion, stepsRemaining]
  );

  const handleStartExperience = useCallback(() => {
    transitionToChat();
  }, [transitionToChat]);

  const handleHistoryNav = useCallback(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(true);
    } else {
      document.getElementById("chat-history-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleWishlistNavigate = useCallback(() => {
    navigate("/wishlist");
  }, [navigate]);

  const handleProfileFocus = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const greetingAudience = profile.relationship ? profile.relationship : "there";
  const progressCopy = isComplete
    ? "Profile complete. Ask for new directions anytime."
    : `Just ${stepsRemaining} more insight${stepsRemaining === 1 ? "" : "s"} until your curated list is ready.`;

  return (
    <div className="space-y-10">
      {isWelcomeMounted ? (
        <div
          className={`overflow-hidden rounded-[36px] border border-white/50 bg-white/70 px-6 py-10 shadow-floating backdrop-blur-glass transition-all duration-700 dark:border-white/10 dark:bg-charcoal/80 md:px-12 md:py-14 ${
            isWelcomeActive ? "max-h-[1200px] opacity-100 translate-y-0" : "pointer-events-none -translate-y-10 opacity-0 max-h-0"
          }`}
        >
          <WelcomeHero onStart={handleStartExperience} isLoadingHistory={isLoadingHistory} />
        </div>
      ) : null}

      <div
        className={`transition-all duration-700 ${
          isChatVisible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-8"
        }`}
      >
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <aside className="hidden lg:flex">
            <div className="flex w-full flex-col gap-6 rounded-[32px] border border-white/40 bg-white/60 p-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/70">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                  Control center
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Navigator</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Manage conversations, wishlists, and personalization boosts.
                </p>
              </div>
              <nav className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSelectSession(null)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-800 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:bg-white/80 hover:shadow-soft-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-mint text-white shadow-glow">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                      </svg>
                    </span>
                    New Chat
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleHistoryNav}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-soft-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-brand/20 text-brand shadow-soft dark:from-white/10 dark:to-brand/30">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 1" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                    History
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Browse</span>
                </button>
                <button
                  type="button"
                  onClick={handleWishlistNavigate}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-soft-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 text-rose-600 shadow-soft dark:from-rose-500/20 dark:to-rose-500/30 dark:text-rose-200">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 010 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </span>
                    Wishlist
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Saved</span>
                </button>
                <button
                  type="button"
                  aria-disabled
                  className="flex w-full items-center justify-between rounded-2xl border border-white/30 bg-white/20 px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft backdrop-blur-glass transition-all duration-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 shadow-soft dark:from-white/10 dark:to-white/5">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 6h2m-1-3v3m-6 4h14m-1 7H6a2 2 0 01-2-2V9a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    Settings
                  </span>
                  <span className="text-xs font-medium text-slate-400">Soon</span>
                </button>
                <button
                  type="button"
                  onClick={handleProfileFocus}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/30 bg-white/20 px-4 py-3 text-sm font-semibold text-slate-600 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:bg-white/40 hover:shadow-soft-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-brand/30 text-brand shadow-soft dark:from-brand/30 dark:to-brand/40 dark:text-white">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c3.866 0 7 1.79 7 4v1H5v-1c0-2.21 3.134-4 7-4zm0-2a4 4 0 100-8 4 4 0 000 8z" />
                      </svg>
                    </span>
                    Profile
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Account</span>
                </button>
              </nav>
              <div className="mt-8 flex-1 overflow-hidden rounded-[24px] border border-white/40 bg-white/60 p-3 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/60">
                <ChatHistorySidebar
                  variant="inline"
                  isOpen
                  onClose={() => setIsSidebarOpen(false)}
                  onSelectSession={handleSelectSession}
                  currentSessionId={currentSessionId}
                />
              </div>
              <div className="rounded-[24px] border border-white/30 bg-gradient-to-r from-brand/20 via-white/40 to-mint/30 p-5 text-sm text-slate-900 shadow-soft backdrop-blur-glass dark:border-white/10 dark:text-slate-100">
                <p className="text-sm font-semibold">Need a fresh vibe?</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Shift tone, budget, or personality clues at any time—Trendella adapts instantly.
                </p>
              </div>
            </div>
          </aside>

          <section className="flex flex-1 flex-col gap-6">
            <div className="rounded-[28px] border border-white/40 bg-white/70 px-6 py-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/70">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                    Concierge desk
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                    Hi {greetingAudience}, how can I assist you today?
                  </h2>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{progressCopy}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {profile.occasion ? `Occasion · ${profile.occasion}` : "Occasion · TBD"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {budgetRangeText ? `Budget · ${budgetRangeText}` : "Budget · Set range"}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/40 bg-white/70 px-4 py-3 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/70">
                <button
                  type="button"
                  onClick={() => handleSelectSession(null)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-mint px-4 py-2 text-xs font-semibold text-white shadow-soft"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                  </svg>
                  New Chat
                </button>
                <button
                  type="button"
                  onClick={handleHistoryNav}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 1" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  History
                </button>
                <button
                  type="button"
                  onClick={handleWishlistNavigate}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 010 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Wishlist
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[520px] flex-1 flex-col gap-5 rounded-[36px] border border-white/40 bg-white/65 p-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/70">
              <div className="flex-1 overflow-hidden">
                <ChatThread
                  messages={messages}
                  products={recommendation?.products ?? []}
                  geminiLinks={recommendation?.meta.gemini_links ?? []}
                  explanations={explanationMap}
                  followUps={recommendation?.follow_up_suggestions ?? []}
                  isLoading={recommendMutation.isPending}
                  onQuickReply={handleQuickReply}
                />
              </div>
              <ChatInput
                onSend={handleSend}
                isDisabled={recommendMutation.isPending}
                placeholder="Share more context or ask for tweaks…"
              />
            </div>

            <div id="features" className="grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => (
                <article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-[28px] border border-white/40 bg-white/60 p-5 text-left shadow-soft backdrop-blur-glass transition-transform duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-white/10 dark:bg-charcoal/70"
                >
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-brand shadow-soft dark:border-white/10 dark:bg-white/5">
                    {feature.icon}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ChatHistorySidebar
        variant="overlay"
        isOpen={isChatVisible && isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />
    </div>
  );
};
