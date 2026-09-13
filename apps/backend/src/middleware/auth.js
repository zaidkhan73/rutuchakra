import { clerkMiddleware, getAuth } from "@clerk/express";

export const attachClerkAuth = clerkMiddleware();

export function requireAuth(req, res, next) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ status: "error", message: "Not authenticated." });
  }
  req.clerkUserId = auth.userId;
  next();
}