import { Server } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "node:http";
import { env } from "./config/env.js";
import { sendMessage } from "./services/message.service.js";

interface AccessTokenPayload {
  userId: string;
  type: "access";
}

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        return next(new Error("Authentication required"));
      }

      const cookies = parse(cookieHeader);
      const accessToken = cookies.accessToken;

      if (!accessToken) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        accessToken,
        env.JWT_ACCESS_SECRET,
      ) as AccessTokenPayload;

      if (decoded.type !== "access" || !decoded.userId) {
        return next(new Error("Invalid access token"));
      }

      socket.data.userId = decoded.userId;

      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
  const userId = socket.data.userId as string;

  console.log(`Socket connected: ${userId}`);

  socket.join(`user:${userId}`);

  socket.on(
    "message:send",
    async (
      data: {
        recipientId: string;
        content: string;
      },
      callback?: (response: {
        success: boolean;
        message?: unknown;
        error?: string;
      }) => void,
    ) => {
      try {
        const message = await sendMessage(
          userId,
          data.recipientId,
          data.content,
        );

        io.to(`user:${data.recipientId}`).emit("message:new", message);

        io.to(`user:${userId}`).emit("message:new", message);

        callback?.({
          success: true,
          message,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to send message";

        callback?.({
          success: false,
          error: message,
        });
      }
    },
  );

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${userId}`);
  });
});

  return io;
};