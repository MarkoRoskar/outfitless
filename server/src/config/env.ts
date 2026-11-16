import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: process.env.PORT || 3000,
    MONGO_URL: process.env.MONGO_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',

    // EMAIL. EMAIL_PROVIDER picks how emails are sent:
    // - "gmail": through a Gmail account, with GMAIL_USER and a GMAIL_APP_PASSWORD (an app
    //   password from the account's security settings, not its normal password)
    // - "resend" (the default): through Resend, with RESEND_API_KEY
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER === 'gmail' ? 'gmail' : 'resend',
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    // Who emails come from, like "outFITless <hello@yourdomain.com>". With Gmail it defaults to
    // the Gmail address (Gmail sends from that address anyway). With Resend the address must be on
    // a domain verified in Resend, and the default is Resend's test sender, which only delivers
    // to the Resend account's own email.
    EMAIL_FROM: process.env.EMAIL_FROM,
} as const;
