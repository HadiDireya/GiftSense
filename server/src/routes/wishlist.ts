import { Router } from "express";
import { z } from "zod";
import { lookupProduct } from "../services/session";
import { getSessionId } from "../utils/session";
import { sanitizeAffiliateUrl } from "../utils/url";
import {
  fetchUserWishlist,
  removeWishlistProduct,
  upsertWishlistProduct
} from "../services/user-wishlist";
import type { NormalizedProduct } from "../schemas/product";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";

const router = Router();

const storeEnum = z.enum(["amazon", "aliexpress", "shein", "ebay", "etsy", "bestbuy"]);

const wishlistAddSchema = z.object({
  productId: z.string().min(1),
  store: storeEnum,
  product: z
    .object({
      title: z.string().min(1),
      description_short: z.string().min(1),
      image: z.string().url(),
      price: z.object({
        value: z.number().nonnegative(),
        currency: z.string().min(1)
      }),
      rating: z
        .object({
          value: z.number().min(0).max(5),
          count: z.number().min(0)
        })
        .optional(),
      badges: z.array(z.string()).optional(),
      affiliate_url: z.string().url().optional(),
      raw: z.record(z.string(), z.any()).optional()
    })
    .optional()
});

const wishlistRemoveSchema = z.object({
  productId: z.string().min(1),
  store: storeEnum.optional()
});

// Every wishlist route now requires a verified Firebase ID token. This keeps the
// API protected across page refreshes when the browser replays cached requests.
router.use(verifyFirebaseToken);

router.get("/", async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const products = await fetchUserWishlist(user.id);
  console.debug("[wishlist] returning products for user", user.id, products.length, products);
  return res.json({ products });
});

router.post("/add", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { productId, store, product: productPayload } = wishlistAddSchema.parse(req.body);
    const sessionId = getSessionId(req);

    // First try to reuse the product we cached during the recommendations call.
    let product = lookupProduct(sessionId, productId, store);

    if (!product && productPayload) {
      // If the cache was blown away (page refresh, new session, etc.) we build
      // the product from the payload sent by the client so we still persist
      // a full document in Firestore.
      const safeAffiliate = productPayload.affiliate_url
        ? sanitizeAffiliateUrl(productPayload.affiliate_url)
        : "";
      const rating = productPayload.rating ?? { value: 0, count: 0 };
      const raw = productPayload.raw ?? {};

      const fallbackProduct: NormalizedProduct = {
        id: productId,
        store,
        title: productPayload.title,
        description_short: productPayload.description_short,
        image: productPayload.image,
        price: productPayload.price,
        rating,
        badges: productPayload.badges ?? [],
        affiliate_url: safeAffiliate,
        raw
      };
      product = fallbackProduct;
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found in recent recommendations" });
    }

    // Always sanitize before persisting to Firestore.
    product.affiliate_url = sanitizeAffiliateUrl(product.affiliate_url);

    await upsertWishlistProduct(user.id, product);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/remove", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { productId, store } = wishlistRemoveSchema.parse(req.body);
    await removeWishlistProduct(user.id, productId, store);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
