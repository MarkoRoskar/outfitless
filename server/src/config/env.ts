import dotenv from "dotenv";

dotenv.config();

// The server can't work without these, so a missing one stops it at once with a clear message,
// rather than failing later on someone's login. Online, the secret that signs logins must be long.
for (const name of ["MONGO_URL", "JWT_SECRET"]) {
    if (!process.env[name]) {
        throw new Error(`${name} is not set. Add it to server/.env, or to the host's environment settings.`);
    }
}
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET!.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

export const env = {
    PORT: process.env.PORT || 3000,
    MONGO_URL: process.env.MONGO_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    // Without a slash at the end, so email links like `${CLIENT_URL}/verify-email` never get "//"
    CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
    NODE_ENV: process.env.NODE_ENV || 'development',

    // EMAIL, sent through this Gmail account's web API (see common/email/mailer.ts). The client ID
    // and secret come from a Google Cloud OAuth client, and the refresh token from running
    // scripts/get-gmail-token.mjs once.
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
} as const;
