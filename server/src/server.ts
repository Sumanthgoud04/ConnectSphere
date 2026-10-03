import dns from "node:dns";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createServer } from "node:http";
import { initializeSocket } from "./socket.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    const httpServer = createServer(app);

    initializeSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`ConnectSphere API running on port ${env.PORT}`);
  });
    
  } catch (error) {
    console.error("Failed to start ConnectSphere server");
    process.exit(1);
  }
};

startServer();