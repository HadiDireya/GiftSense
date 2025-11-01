import axios from "axios";
import { getFirebaseAuth, waitForAuthReady } from "./firebase";
import type { RecipientProfile } from "../state/profile";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export interface NormalizedProduct {
  id: string;
  store: "amazon" | "aliexpress" | "shein" | "ebay" | "etsy" | "bestbuy";
  title: string;
  description_short: string;
  image: string;
  price: { value: number; currency: string };
  rating: { value: number; count: number };
  badges: string[];
  affiliate_url: string;
  raw: Record<string, unknown>;
}

export interface GeminiLinkSuggestion {
  store: NormalizedProduct["store"];
  query: string;
  url: string;
}

export interface RenderingContract {
  meta: {
    profile_filled: boolean;
    next_action: string;
    gemini_links: GeminiLinkSuggestion[];
  };
  explanations: Array<{ product_id: string; why: string }>;
  follow_up_suggestions: string[];
  products_ranked: string[];
}

export interface RecommendResponse extends RenderingContract {
  products: NormalizedProduct[];
}

console.log("apiClient configured", API_BASE);

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

apiClient.interceptors.request.use(async (config) => {
  // Ensure Firebase has restored the current user before attaching tokens.
  console.log("sending request", config.url, config.method);
  await waitForAuthReady();
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const requestRecommendations = async (profile: RecipientProfile) => {
  const { data } = await apiClient.post<RecommendResponse>("/api/recommend", profile);
  return data;
};

export const fetchWishlist = async () => {
  const { data } = await apiClient.get<{ products: NormalizedProduct[] }>("/api/wishlist");
  return data.products;
};

export const addWishlistItem = async (product: NormalizedProduct) => {
  await apiClient.post("/api/wishlist/add", {
    productId: product.id,
    store: product.store,
    product
  });
};

export const removeWishlistItem = async (productId: string, store?: string) => {
  await apiClient.post("/api/wishlist/remove", { productId, store });
};

export interface MeResponse {
  user: { id: string; name: string; email: string; picture?: string } | null;
}

export const fetchMe = async () => {
  const { data } = await apiClient.get<MeResponse>("/api/me");
  return data.user;
};

export const postFirebaseSession = async (idToken: string) => {
  await apiClient.post("/api/auth/session", { idToken });
};

export const revokeSession = async () => {
  await apiClient.post("/api/auth/logout");
};
