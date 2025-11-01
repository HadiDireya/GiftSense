import type { NormalizedProduct } from "../schemas/product";
import { getFirebaseFirestore } from "../utils/firebase";
import { sanitizeAffiliateUrl } from "../utils/url";

// Firestore path helper - every wishlist document lives at users/{uid}/wishlist/{store|productId}
const wishlistCollection = (userId: string) =>
  getFirebaseFirestore().collection("users").doc(userId).collection("wishlist");

const docIdFromProduct = (product: Pick<NormalizedProduct, "id" | "store">) =>
  `${product.store}|${product.id}`;

const STORE_OPTIONS: NormalizedProduct["store"][] = [
  "amazon",
  "aliexpress",
  "shein",
  "ebay",
  "etsy",
  "bestbuy"
];

export const fetchUserWishlist = async (userId: string): Promise<NormalizedProduct[]> => {
  const snapshot = await wishlistCollection(userId).get();

  // Helpful debug logging so we can confirm the raw docs returned from Firestore on reloads.
  console.debug("[wishlist] fetched documents", snapshot.size);

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    // Ensure we never lose the store identifier even if the stored doc is missing / malformed.
    const store = STORE_OPTIONS.includes(data.store) ? data.store : "amazon";

    const rating = data.rating && typeof data.rating.value === "number"
      ? {
          value: data.rating.value as number,
          count: typeof data.rating.count === "number" ? data.rating.count : 0
        }
      : { value: 0, count: 0 };

    const price =
      data.price && typeof data.price.value === "number" && typeof data.price.currency === "string"
        ? { value: data.price.value as number, currency: data.price.currency as string }
        : { value: 0, currency: "USD" };

    const normalized: NormalizedProduct = {
      // Some legacy docs might not embed `id`, so we fall back to parsing it from docId.
      id: typeof data.id === "string" ? data.id : doc.id.split("|")[1] ?? doc.id,
      store,
      title: typeof data.title === "string" ? data.title : "Saved item",
      description_short: typeof data.description_short === "string" ? data.description_short : "",
      image: typeof data.image === "string" ? data.image : "",
      price,
      rating,
      badges: Array.isArray(data.badges) ? (data.badges as string[]) : [],
      affiliate_url: sanitizeAffiliateUrl(typeof data.affiliate_url === "string" ? data.affiliate_url : ""),
      raw: (data.raw as Record<string, unknown>) ?? {}
    };

    return normalized;
  });
};

export const upsertWishlistProduct = async (userId: string, product: NormalizedProduct) => {
  await wishlistCollection(userId).doc(docIdFromProduct(product)).set(product);
};

export const removeWishlistProduct = async (
  userId: string,
  productId: string,
  store?: NormalizedProduct["store"]
) => {
  if (store) {
    await wishlistCollection(userId).doc(docIdFromProduct({ id: productId, store })).delete();
    return;
  }

  const snapshot = await wishlistCollection(userId).where("id", "==", productId).get();
  if (snapshot.empty) return;
  const batch = getFirebaseFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

export const mergeWishlistProducts = async (userId: string, products: NormalizedProduct[]) => {
  if (products.length === 0) return;
  const firestore = getFirebaseFirestore();
  const batch = firestore.batch();
  const collectionRef = wishlistCollection(userId);

  products.forEach((product) => {
    batch.set(collectionRef.doc(docIdFromProduct(product)), product, { merge: true });
  });

  await batch.commit();
};
