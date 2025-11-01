import type { NormalizedProduct } from "../schemas/product";

type ProductMap = Map<string, NormalizedProduct>;

// Recommendations remembered per request-session (based on IP or similar)
const recommendationMemory = new Map<string, ProductMap>();

// Wishlists
const guestWishlistMemory = new Map<string, ProductMap>(); // key: guest_session_id

const getOrCreate = (store: Map<string, ProductMap>, key: string): ProductMap => {
  if (!store.has(key)) {
    store.set(key, new Map());
  }
  return store.get(key)!;
};

const wishlistKey = (product: Pick<NormalizedProduct, "id" | "store">) =>
  `${product.store}|${product.id}`;

export const rememberProducts = (sessionId: string, products: NormalizedProduct[]) => {
  const memory = getOrCreate(recommendationMemory, sessionId);
  products.forEach((product) => {
    // Use composite key to avoid cross-store collisions when looking up later
    memory.set(wishlistKey(product), product);
  });
};

export const lookupProduct = (sessionId: string, productId: string, store?: string) => {
  const memory = recommendationMemory.get(sessionId);
  if (!memory) return null;
  // If store provided, prefer composite key, else try any product whose id matches
  if (store) {
    const key = `${store}|${productId}`;
    return memory.get(key) ?? null;
  }
  for (const [key, prod] of memory.entries()) {
    if (key.endsWith(`|${productId}`)) return prod;
  }
  return null;
};

// Guest wishlist
export const getGuestWishlist = (guestId: string): NormalizedProduct[] => {
  return Array.from(getOrCreate(guestWishlistMemory, guestId).values());
};

export const addToGuestWishlist = (guestId: string, product: NormalizedProduct) => {
  const wishlist = getOrCreate(guestWishlistMemory, guestId);
  wishlist.set(wishlistKey(product), product);
};

export const removeFromGuestWishlist = (guestId: string, productId: string, store?: string) => {
  const wishlist = getOrCreate(guestWishlistMemory, guestId);
  if (store) {
    wishlist.delete(`${store}|${productId}`);
    return;
  }
  for (const key of Array.from(wishlist.keys())) {
    if (key.endsWith(`|${productId}`)) wishlist.delete(key);
  }
};

export const drainGuestWishlist = (guestId: string): NormalizedProduct[] => {
  const guest = guestWishlistMemory.get(guestId);
  if (!guest) return [];
  const items = Array.from(guest.values());
  guestWishlistMemory.delete(guestId);
  return items;
};
