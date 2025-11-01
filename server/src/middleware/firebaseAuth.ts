import type { NextFunction, Request, Response } from "express";
import { getFirebaseAuth } from "../utils/firebase";
import type { SessionUser } from "../utils/auth";

/**
 * Express middleware that validates the Firebase ID token sent from the client.
 * If verification succeeds we attach the decoded user to req.user so downstream
 * handlers (e.g. /api/wishlist) can rely on it after a refresh.
 */
export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token, true);

    const user: SessionUser = {
      id: decoded.uid,
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? decoded.email ?? decoded.uid,
      picture: decoded.picture ?? undefined
    };

    req.user = user;
    next();
  } catch (error) {
    console.error("[auth] Failed to verify Firebase token", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};
