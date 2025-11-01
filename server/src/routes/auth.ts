import { Router } from "express";
import { z } from "zod";
import {
  GUEST_COOKIE,
  clearGuestCookie,
  clearSessionCookie,
  createSessionCookie,
  ensureGuestCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie
} from "../utils/auth";
import { getFirebaseAuth } from "../utils/firebase";
import { drainGuestWishlist } from "../services/session";
import { mergeWishlistProducts } from "../services/user-wishlist";
import { sanitizeAffiliateUrl } from "../utils/url";

const router = Router();

router.post("/session", async (req, res, next) => {
  try {
    const schema = z.object({ idToken: z.string().min(1) });
    const { idToken } = schema.parse(req.body);

    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken);
    setSessionCookie(res, sessionCookie);

    const guestId = req.cookies?.[GUEST_COOKIE] as string | undefined;
    if (guestId) {
      const guestWishlist = drainGuestWishlist(guestId).map((product) => ({
        ...product,
        affiliate_url: sanitizeAffiliateUrl(product.affiliate_url)
      }));
      if (guestWishlist.length > 0) {
        await mergeWishlistProducts(decoded.uid, guestWishlist);
      }
      clearGuestCookie(res);
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (sessionCookie) {
      try {
        const auth = getFirebaseAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, true);
        await auth.revokeRefreshTokens(decoded.sub);
      } catch {
        // ignore verification errors during logout
      }
    }
    clearSessionCookie(res);
    ensureGuestCookie(req, res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
