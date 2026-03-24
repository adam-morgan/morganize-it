import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/server/auth/jwt";

declare global {
  namespace Express {
    interface Request {
      jwtUserId?: string;
    }
  }
}

export const jwtMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      req.jwtUserId = payload.userId;
    } catch {
      // Invalid token -- silently skip, let route handlers decide on auth requirements
    }
  }

  next();
};
