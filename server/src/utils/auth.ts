import type { Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { env, isProd } from "./env";
import { getFirebaseAuth } from "./firebase";

export const SESSION_COOKIE_NAME = "firebase_session";
const SESSION_COOKIE = SESSION_COOKIE_NAME;
export const GUEST_COOKIE = "guest_session_id";

export interface SessionUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

const cookieOptions = {
  httpOnly: true as const,
  secure: isProd as boolean,
  sameSite: "lax" as const,
  path: "/"
};

const buildSessionUser = (token: DecodedIdToken): SessionUser => ({
  id: token.uid,
  uid: token.uid,
  email: token.email ?? "",
  name: token.name ?? token.email ?? token.uid,
  picture: token.picture ?? undefined
});

export const createSessionCookie = async (idToken: string) => {
  const auth = getFirebaseAuth();
  const expiresIn = env.FIREBASE_SESSION_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return auth.createSessionCookie(idToken, { expiresIn });
};

export const setSessionCookie = (res: Response, sessionCookie: string) => {
  res.cookie(SESSION_COOKIE, sessionCookie, {
    ...cookieOptions,
    maxAge: env.FIREBASE_SESSION_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
};

export const ensureGuestCookie = (req: Request, res: Response) => {
  let guestId = req.cookies?.[GUEST_COOKIE] as string | undefined;
  if (!guestId) {
    guestId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    res.cookie(GUEST_COOKIE, guestId, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
  return guestId;
};

export const clearGuestCookie = (res: Response) => {
  res.clearCookie(GUEST_COOKIE, cookieOptions);
};

export const getUserFromRequest = async (req: Request): Promise<SessionUser | null> => {
  if (req.user) {
    return req.user;
  }

  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    try {
      const token = authorization.split(" ")[1]!;
      const decoded = await getFirebaseAuth().verifyIdToken(token, true);
      const user = buildSessionUser(decoded);
      req.user = user;
      return user;
    } catch {
      // fall through to cookie validation
    }
  }

  const sessionCookie = req.cookies?.[SESSION_COOKIE];
  if (!sessionCookie) return null;
  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const user = buildSessionUser(decoded);
    req.user = user;
    return user;
  } catch {
    return null;
  }
};
