import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: process.env.PORT || 3000,
    MONGO_URL: process.env.MONGO_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
};