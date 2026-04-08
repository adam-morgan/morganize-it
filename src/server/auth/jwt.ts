import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
};

type InternalPayload = TokenPayload & {
  type?: "access" | "refresh";
};

const getJwtSecret = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst");
    return Resource.JwtSecret.value;
  } catch {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET env var or SST JwtSecret resource required");
    }
    return secret;
  }
};

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, type: "access" }, getJwtSecret(), { expiresIn: "15m" });
};

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret()) as InternalPayload;
  if (decoded.type === "refresh") {
    throw new Error("Cannot use refresh token as access token");
  }
  return { userId: decoded.userId };
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, type: "refresh" }, getJwtSecret(), { expiresIn: "30d" });
};

export type RefreshTokenPayload = TokenPayload & { iat: number };

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret()) as InternalPayload & { iat: number };
  if (decoded.type !== "refresh") {
    throw new Error("Not a refresh token");
  }
  return { userId: decoded.userId, iat: decoded.iat };
};
