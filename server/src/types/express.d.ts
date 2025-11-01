import type { SessionUser } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser | null;
    }
  }
}

export {};
