import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getConversation,
  getConversationSummaries,
  markConversationAsRead,
  sendMessage,
} from "../services/message.service.js";

export const sendMessageController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const senderId = req.user?.userId;
    const recipientId = req.body?.recipientId;
    const content = req.body?.content;

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      typeof recipientId !== "string" ||
      typeof content !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Recipient and message content are required",
      });
    }

    const message = await sendMessage(
      senderId,
      recipientId,
      content,
    );

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send message";

    if (
      message === "You can only message accepted connections"
    ) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    if (
      message === "You cannot message yourself" ||
      message === "Message content is required"
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

export const getConversationSummariesController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const conversations =
      await getConversationSummaries(userId);

    return res.status(200).json({
      success: true,
      data: {
        conversations,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load conversations",
    });
  }
};

export const getConversationController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    const otherUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (typeof otherUserId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const messages = await getConversation(
      userId,
      otherUserId,
    );

    return res.status(200).json({
      success: true,
      data: {
        messages,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get conversation";

    if (
      message ===
      "You can only view messages with accepted connections"
    ) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    if (message === "Invalid conversation") {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation",
    });
  }
};

export const markConversationAsReadController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    const otherUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (typeof otherUserId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    await markConversationAsRead(
      userId,
      otherUserId,
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to mark messages as seen";

    if (
      message ===
      "You can only mark messages as read with accepted connections"
    ) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as seen",
    });
  }
};