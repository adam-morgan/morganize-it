import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
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
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
