import dns from "node:dns/promises";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

dns.setServers(["1.1.1.1", "1.0.0.1"]);
const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();