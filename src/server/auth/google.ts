import { OAuth2Client } from "google-auth-library";

export type GoogleUserInfo = {
  email: string;
  givenName: string;
  familyName: string;
};

const getGoogleClientId = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst");
    return Resource.GoogleClientId.value;
  } catch {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID env var or SST GoogleClientId resource required");
    }
    return clientId;
  }
};

export const verifyGoogleToken = async (credential: string): Promise<GoogleUserInfo> => {
  const clientId = getGoogleClientId();
  const client = new OAuth2Client(clientId);

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Unable to verify Google token");
  }

  if (!payload.email || !payload.email_verified) {
    throw new Error("Google account email is not verified");
  }

  return {
    email: payload.email,
    givenName: payload.given_name ?? "",
    familyName: payload.family_name ?? "",
  };
};
